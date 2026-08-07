import { prisma } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ApprovalService {
  async approve(importBatchId: number, reviewedById: number) {
    const batch = await prisma.importBatch.findUnique({
      where: {
        id: importBatchId,
      },
    });

    if (!batch) {
      throw new AppError("Import batch not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "IMPORT_BATCH_NOT_FOUND",
      });
    }

    if (batch.status !== "WAITING_APPROVAL") {
      throw new AppError("Only imports waiting for approval can be approved.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "IMPORT_NOT_WAITING_APPROVAL",
      });
    }

    return prisma.$transaction(
      async (tx) => {
        const rows = await tx.importRow.findMany({
          where: {
            importBatchId,
            status: {
              in: ["NEW", "CHANGED", "UNCHANGED"],
            },
          },
          orderBy: {
            rowNumber: "asc",
          },
        });

        const companyMap = new Map<number, number>();
        const documentMap = new Map<number, number>();

        let processedRowCount = 0;

        for (const row of rows) {
          if (row.externalCompanyId === null) {
            continue;
          }

          /*
           * 1. COMPANY
           *
           * Aynı firma Excel'de birden fazla satırda bulunabilir.
           * Önce map'e bakıyoruz.
           */
          let companyId = companyMap.get(row.externalCompanyId);

          if (!companyId) {
            const company = await tx.company.upsert({
              where: {
                externalCompanyId: row.externalCompanyId,
              },
              create: {
                externalCompanyId: row.externalCompanyId,
                name: row.companyName ?? "",
                taxNumber: row.taxNumber ?? "",
                processStatus: row.processStatus,
                isActive: true,
              },
              update: {
                name: row.companyName ?? "",
                taxNumber: row.taxNumber ?? "",
                processStatus: row.processStatus,
                isActive: true,
              },
            });

            companyId = company.id;

            companyMap.set(row.externalCompanyId, company.id);
          }

          /*
           * 2. COMPANY AUTHORIZATION
           *
           * Firma başına yalnızca bir authorization kaydı var.
           */
          await tx.companyAuthorization.upsert({
            where: {
              companyId,
            },
            create: {
              companyId,
              authorizationEndDate: row.authorizationEndDate,
            },
            update: {
              authorizationEndDate: row.authorizationEndDate,
            },
          });

          /*
           * 3. INCENTIVE DOCUMENT
           *
           * Bir firmanın birden fazla belgesi olabilir.
           */
          let documentId: number | null = null;

          if (row.externalDocumentId !== null) {
            documentId = documentMap.get(row.externalDocumentId) ?? null;

            if (!documentId) {
              const document = await tx.incentiveDocument.upsert({
                where: {
                  externalDocumentId: row.externalDocumentId,
                },
                create: {
                  companyId,
                  externalDocumentId: row.externalDocumentId,
                  documentNumber: row.documentNumber,
                  documentStartDate: row.documentStartDate,
                  documentEndDate: row.documentEndDate,
                  extensionDate: row.extensionDate,
                  supportClass: row.supportClass,
                  isActive: true,
                },
                update: {
                  companyId,
                  documentNumber: row.documentNumber,
                  documentStartDate: row.documentStartDate,
                  documentEndDate: row.documentEndDate,
                  extensionDate: row.extensionDate,
                  supportClass: row.supportClass,
                  isActive: true,
                },
              });

              documentId = document.id;

              documentMap.set(row.externalDocumentId, document.id);
            }
          }

          /*
           * 4. IMPORT ROW'U GERÇEK KAYITLARA BAĞLA
           */
          await tx.importRow.update({
            where: {
              id: row.id,
            },
            data: {
              companyId,
              documentId,
            },
          });

          processedRowCount += 1;
        }

        /*
         * 5. IMPORT CHANGE KAYITLARINI ONAYLA
         */
        await tx.importChange.updateMany({
          where: {
            importBatchId,
            status: "PENDING",
          },
          data: {
            status: "APPROVED",
            reviewedById,
            reviewedAt: new Date(),
          },
        });

        /*
         * 6. BATCH TAMAMLANDI
         */
        const completedBatch = await tx.importBatch.update({
          where: {
            id: importBatchId,
          },
          data: {
            status: "COMPLETED",
            reviewedById,
            reviewedAt: new Date(),
            completedAt: new Date(),
          },
        });

        return {
          batch: completedBatch,
          processedRowCount,
          companyCount: companyMap.size,
          documentCount: documentMap.size,
        };
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  }
}
