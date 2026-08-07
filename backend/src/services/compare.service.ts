import type {
  EntityType,
  ImportRowStatus,
  Prisma,
} from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";
import type { CompareRepository } from "../repositories/compare.repository.js";
import type { ImportRepository } from "../repositories/import.repository.js";
import type { ImportRowRepository } from "../repositories/import-row.repository.js";

type ChangeInput = {
  entityType: EntityType;
  changeType: "CREATED" | "UPDATED" | "REACTIVATED";
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  companyId?: number | null;
  documentId?: number | null;
};

type RowComparisonResult = {
  status: ImportRowStatus;
  companyId: number | null;
  documentId: number | null;
  changes: ChangeInput[];
};

type ExistingCompany = Prisma.CompanyGetPayload<{
  include: {
    authorization: true;
    documents: true;
  };
}>;

type ImportRowData = Prisma.ImportRowGetPayload<Record<string, never>>;

export class CompareService {
  /*
   * Constructor parametreleri mevcut import.module.ts yapısının
   * bozulmaması için korunuyor.
   *
   * Karşılaştırma işlemi tek transaction içerisinde yapıldığı için
   * burada doğrudan Prisma kullanılıyor.
   */
  constructor(
    _importRepository: ImportRepository,
    _importRowRepository: ImportRowRepository,
    _compareRepository: CompareRepository,
  ) {}

  async compare(importBatchId: number) {
    try {
      await prisma.importBatch.update({
        where: {
          id: importBatchId,
        },
        data: {
          status: "PROCESSING",
        },
      });

      return await prisma.$transaction(
        async (transaction) => {
          const batch = await transaction.importBatch.findUnique({
            where: {
              id: importBatchId,
            },
            include: {
              rows: {
                orderBy: {
                  rowNumber: "asc",
                },
              },
            },
          });

          if (!batch) {
            throw new Error("Import batch bulunamadı.");
          }

          if (batch.status === "COMPLETED") {
            throw new Error(
              "Tamamlanmış import batch tekrar karşılaştırılamaz.",
            );
          }

          if (batch.status === "CANCELLED") {
            throw new Error("İptal edilmiş import batch karşılaştırılamaz.");
          }

          /*
           * Endpoint ikinci kez çalıştırılırsa aynı değişikliklerin
           * tekrar oluşturulmaması için eski karşılaştırma kayıtları silinir.
           */
          await transaction.importChange.deleteMany({
            where: {
              importBatchId,
            },
          });

          const comparableRows = batch.rows.filter(
            (row) => row.status !== "INVALID",
          );

          const externalCompanyIds = [
            ...new Set(
              comparableRows
                .map((row) => row.externalCompanyId)
                .filter((id): id is number => id !== null),
            ),
          ];

          const companies = await transaction.company.findMany({
            where: {
              externalCompanyId: {
                in: externalCompanyIds,
              },
            },
            include: {
              authorization: true,
              documents: true,
            },
          });

          const companyMap = new Map<number, ExistingCompany>();

          for (const company of companies) {
            companyMap.set(company.externalCompanyId, company);
          }

          let newRowCount = 0;
          let changedRowCount = 0;
          let unchangedRowCount = 0;
          let invalidRowCount = batch.rows.filter(
            (row) => row.status === "INVALID",
          ).length;

          const changeRecords: Prisma.ImportChangeCreateManyInput[] = [];

          for (const row of comparableRows) {
            if (row.externalCompanyId === null) {
              await transaction.importRow.update({
                where: {
                  id: row.id,
                },
                data: {
                  status: "INVALID",
                  errorMessage: "Firma ID bulunamadı.",
                  companyId: null,
                  documentId: null,
                },
              });

              invalidRowCount += 1;
              continue;
            }

            const existingCompany = companyMap.get(row.externalCompanyId);

            const result = this.compareRow(row, existingCompany);

            if (result.status === "NEW") {
              newRowCount += 1;
            } else if (result.status === "CHANGED") {
              changedRowCount += 1;
            } else if (result.status === "UNCHANGED") {
              unchangedRowCount += 1;
            }

            await transaction.importRow.update({
              where: {
                id: row.id,
              },
              data: {
                status: result.status,
                companyId: result.companyId,
                documentId: result.documentId,
                errorMessage: null,
              },
            });

            for (const change of result.changes) {
              changeRecords.push({
                importBatchId,
                importRowId: row.id,
                companyId: change.companyId ?? null,
                documentId: change.documentId ?? null,
                entityType: change.entityType,
                changeType: change.changeType,
                fieldName: change.fieldName,
                oldValue: change.oldValue,
                newValue: change.newValue,
                status: "PENDING",
              });
            }
          }

          if (changeRecords.length > 0) {
            await transaction.importChange.createMany({
              data: changeRecords,
            });
          }

          const updatedBatch = await transaction.importBatch.update({
            where: {
              id: importBatchId,
            },
            data: {
              status: "WAITING_APPROVAL",
              newRowCount,
              changedRowCount,
              unchangedRowCount,
              invalidRowCount,
              validRowCount: newRowCount + changedRowCount + unchangedRowCount,
            },
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });

          return {
            batch: updatedBatch,
            statistics: {
              totalRowCount: batch.rows.length,
              validRowCount: newRowCount + changedRowCount + unchangedRowCount,
              invalidRowCount,
              newRowCount,
              changedRowCount,
              unchangedRowCount,
              changeCount: changeRecords.length,
            },
          };
        },
        {
          maxWait: 10_000,
          timeout: 60_000,
        },
      );
    } catch (error) {
      await prisma.importBatch.updateMany({
        where: {
          id: importBatchId,
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        data: {
          status: "FAILED",
        },
      });

      throw error;
    }
  }

  private compareRow(
    row: ImportRowData,
    company?: ExistingCompany,
  ): RowComparisonResult {
    if (!company) {
      return this.createNewCompanyResult(row);
    }

    const changes: ChangeInput[] = [];

    this.compareCompany(row, company, changes);
    this.compareAuthorization(row, company, changes);

    const document =
      row.externalDocumentId !== null
        ? company.documents.find(
            (item) => item.externalDocumentId === row.externalDocumentId,
          )
        : undefined;

    if (row.externalDocumentId !== null) {
      if (!document) {
        changes.push({
          entityType: "INCENTIVE_DOCUMENT",
          changeType: "CREATED",
          fieldName: "__entity__",
          oldValue: null,
          newValue: String(row.externalDocumentId),
          companyId: company.id,
          documentId: null,
        });
      } else {
        this.compareDocument(row, company.id, document, changes);
      }
    }

    return {
      status: changes.length > 0 ? "CHANGED" : "UNCHANGED",
      companyId: company.id,
      documentId: document?.id ?? null,
      changes,
    };
  }

  private createNewCompanyResult(row: ImportRowData): RowComparisonResult {
    const changes: ChangeInput[] = [
      {
        entityType: "COMPANY",
        changeType: "CREATED",
        fieldName: "__entity__",
        oldValue: null,
        newValue: String(row.externalCompanyId),
        companyId: null,
        documentId: null,
      },
    ];

    if (row.authorizationEndDate !== null) {
      changes.push({
        entityType: "COMPANY_AUTHORIZATION",
        changeType: "CREATED",
        fieldName: "authorizationEndDate",
        oldValue: null,
        newValue: this.toComparableValue(row.authorizationEndDate),
        companyId: null,
        documentId: null,
      });
    }

    if (row.externalDocumentId !== null) {
      changes.push({
        entityType: "INCENTIVE_DOCUMENT",
        changeType: "CREATED",
        fieldName: "__entity__",
        oldValue: null,
        newValue: String(row.externalDocumentId),
        companyId: null,
        documentId: null,
      });
    }

    return {
      status: "NEW",
      companyId: null,
      documentId: null,
      changes,
    };
  }

  private compareCompany(
    row: ImportRowData,
    company: ExistingCompany,
    changes: ChangeInput[],
  ) {
    this.addChangeIfDifferent(changes, {
      entityType: "COMPANY",
      fieldName: "name",
      oldValue: company.name,
      newValue: row.companyName,
      companyId: company.id,
    });

    this.addChangeIfDifferent(changes, {
      entityType: "COMPANY",
      fieldName: "taxNumber",
      oldValue: company.taxNumber,
      newValue: row.taxNumber,
      companyId: company.id,
    });

    this.addChangeIfDifferent(changes, {
      entityType: "COMPANY",
      fieldName: "processStatus",
      oldValue: company.processStatus,
      newValue: row.processStatus,
      companyId: company.id,
    });

    if (!company.isActive) {
      changes.push({
        entityType: "COMPANY",
        changeType: "REACTIVATED",
        fieldName: "isActive",
        oldValue: "false",
        newValue: "true",
        companyId: company.id,
        documentId: null,
      });
    }
  }

  private compareAuthorization(
    row: ImportRowData,
    company: ExistingCompany,
    changes: ChangeInput[],
  ) {
    const currentAuthorizationDate =
      company.authorization?.authorizationEndDate ?? null;

    if (
      this.toComparableValue(currentAuthorizationDate) ===
      this.toComparableValue(row.authorizationEndDate)
    ) {
      return;
    }

    changes.push({
      entityType: "COMPANY_AUTHORIZATION",
      changeType: company.authorization ? "UPDATED" : "CREATED",
      fieldName: "authorizationEndDate",
      oldValue: this.toComparableValue(currentAuthorizationDate),
      newValue: this.toComparableValue(row.authorizationEndDate),
      companyId: company.id,
      documentId: null,
    });
  }

  private compareDocument(
    row: ImportRowData,
    companyId: number,
    document: ExistingCompany["documents"][number],
    changes: ChangeInput[],
  ) {
    const baseData = {
      entityType: "INCENTIVE_DOCUMENT" as const,
      companyId,
      documentId: document.id,
    };

    this.addChangeIfDifferent(changes, {
      ...baseData,
      fieldName: "documentNumber",
      oldValue: document.documentNumber,
      newValue: row.documentNumber,
    });

    this.addChangeIfDifferent(changes, {
      ...baseData,
      fieldName: "documentStartDate",
      oldValue: document.documentStartDate,
      newValue: row.documentStartDate,
    });

    this.addChangeIfDifferent(changes, {
      ...baseData,
      fieldName: "documentEndDate",
      oldValue: document.documentEndDate,
      newValue: row.documentEndDate,
    });

    this.addChangeIfDifferent(changes, {
      ...baseData,
      fieldName: "extensionDate",
      oldValue: document.extensionDate,
      newValue: row.extensionDate,
    });

    this.addChangeIfDifferent(changes, {
      ...baseData,
      fieldName: "supportClass",
      oldValue: document.supportClass,
      newValue: row.supportClass,
    });

    if (!document.isActive) {
      changes.push({
        ...baseData,
        changeType: "REACTIVATED",
        fieldName: "isActive",
        oldValue: "false",
        newValue: "true",
      });
    }
  }

  private addChangeIfDifferent(
    changes: ChangeInput[],
    data: {
      entityType: EntityType;
      fieldName: string;
      oldValue: unknown;
      newValue: unknown;
      companyId?: number | null;
      documentId?: number | null;
    },
  ) {
    const oldValue = this.toComparableValue(data.oldValue);
    const newValue = this.toComparableValue(data.newValue);

    if (oldValue === newValue) {
      return;
    }

    changes.push({
      entityType: data.entityType,
      changeType: "UPDATED",
      fieldName: data.fieldName,
      oldValue,
      newValue,
      companyId: data.companyId ?? null,
      documentId: data.documentId ?? null,
    });
  }

  private toComparableValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === "string") {
      const normalizedValue = value.trim();

      return normalizedValue.length > 0 ? normalizedValue : null;
    }

    return String(value);
  }
}
