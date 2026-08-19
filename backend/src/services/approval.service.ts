import { prisma } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type ReviewChangeInput = {
  importBatchId: number;
  changeId: number;
  reviewedById: number;
  status: "APPROVED" | "REJECTED";
  rejectedReason?: string | null;
};

export class ApprovalService {
  async reviewChange(input: ReviewChangeInput) {
    const { importBatchId, changeId, reviewedById, status, rejectedReason } =
      input;

    /* =====================================================
       1. BATCH KONTROLÜ
    ===================================================== */

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
      throw new AppError("Only imports waiting for approval can be reviewed.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "IMPORT_NOT_WAITING_APPROVAL",
      });
    }

    /* =====================================================
       2. TRANSACTION
    ===================================================== */

    return prisma.$transaction(
      async (tx) => {
        const change = await tx.importChange.findFirst({
          where: {
            id: changeId,
            importBatchId,
          },
          include: {
            importRow: true,
          },
        });

        if (!change) {
          throw new AppError("Import change not found.", {
            statusCode: HTTP_STATUS.NOT_FOUND,
            code: "IMPORT_CHANGE_NOT_FOUND",
          });
        }

        /* =================================================
           3. DAHA ÖNCE KARAR VERİLMİŞ Mİ?
        ================================================= */

        if (change.status !== "PENDING") {
          throw new AppError("This change has already been reviewed.", {
            statusCode: HTTP_STATUS.BAD_REQUEST,
            code: "IMPORT_CHANGE_ALREADY_REVIEWED",
          });
        }

        const row = change.importRow;

        /* =================================================
           HELPER: DATE
        ================================================= */

        const parseDate = (value: string | null): Date | null => {
          if (!value) {
            return null;
          }

          const date = new Date(value);

          if (Number.isNaN(date.getTime())) {
            throw new AppError(`Invalid date value: ${value}`, {
              statusCode: HTTP_STATUS.BAD_REQUEST,
              code: "INVALID_DATE_VALUE",
            });
          }

          return date;
        };

        /* =================================================
           HELPER: BOOLEAN
        ================================================= */

        const parseBoolean = (value: string | null): boolean => {
          if (!value) {
            return false;
          }

          return value.toLowerCase() === "true" || value === "1";
        };

        /* =================================================
           BAĞLANTI ID'LERİ
        ================================================= */

        let companyId = change.companyId ?? row?.companyId ?? null;

        let documentId = change.documentId ?? row?.documentId ?? null;

        let entityId: number | null = null;

        /* =================================================
           HELPER: COMPANY BUL
        ================================================= */

        const findCompany = async () => {
          if (companyId) {
            const company = await tx.company.findUnique({
              where: {
                id: companyId,
              },
            });

            if (company) {
              return company;
            }
          }

          if (!row?.externalCompanyId) {
            throw new AppError("Company information could not be found.", {
              statusCode: HTTP_STATUS.BAD_REQUEST,
              code: "COMPANY_INFORMATION_MISSING",
            });
          }

          const company = await tx.company.findUnique({
            where: {
              externalCompanyId: row.externalCompanyId,
            },
          });

          if (!company) {
            throw new AppError(
              "Company could not be found. Approve the new company record first.",
              {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                code: "COMPANY_NOT_FOUND",
              },
            );
          }

          companyId = company.id;

          return company;
        };

        /* =================================================
           HELPER: DOCUMENT BUL
        ================================================= */

        const findDocument = async () => {
          if (documentId) {
            const document = await tx.incentiveDocument.findUnique({
              where: {
                id: documentId,
              },
            });

            if (document) {
              return document;
            }
          }

          if (!row?.externalDocumentId) {
            throw new AppError("Document information could not be found.", {
              statusCode: HTTP_STATUS.BAD_REQUEST,
              code: "DOCUMENT_INFORMATION_MISSING",
            });
          }

          const document = await tx.incentiveDocument.findUnique({
            where: {
              externalDocumentId: row.externalDocumentId,
            },
          });

          if (!document) {
            throw new AppError(
              "Document could not be found. Approve the new document record first.",
              {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                code: "DOCUMENT_NOT_FOUND",
              },
            );
          }

          documentId = document.id;
          companyId = document.companyId;

          return document;
        };

        /* =================================================
           4. REDDEDİLDİYSE CANLI DB'YE DOKUNMA
        ================================================= */

        if (status === "REJECTED") {
          const reviewedChange = await tx.importChange.update({
            where: {
              id: change.id,
            },
            data: {
              status: "REJECTED",
              reviewedById,
              reviewedAt: new Date(),
              rejectedReason: rejectedReason ?? null,
            },
          });

          const pendingCount = await tx.importChange.count({
            where: {
              importBatchId,
              status: "PENDING",
            },
          });

          const approvedCount = await tx.importChange.count({
            where: {
              importBatchId,
              status: "APPROVED",
            },
          });

          const rejectedCount = await tx.importChange.count({
            where: {
              importBatchId,
              status: "REJECTED",
            },
          });

          let batchStatus = batch.status;

          /*
           * Artık hiç PENDING değişiklik kalmadıysa
           * batch tamamlanır.
           */
          if (pendingCount === 0) {
            const now = new Date();

            const completedBatch = await tx.importBatch.update({
              where: {
                id: importBatchId,
              },
              data: {
                status: "COMPLETED",
                reviewedById,
                reviewedAt: now,
                completedAt: now,
              },
            });

            batchStatus = completedBatch.status;
          }

          return {
            change: reviewedChange,
            summary: {
              pendingCount,
              approvedCount,
              rejectedCount,
            },
            batchStatus,
          };
        }

        /* =================================================
           5. ONAYLANDI
           
           BURADAN İTİBAREN CANLI DB DEĞİŞİR.
        ================================================= */

        if (!row) {
          /*
           * "Yeni listede yok" gibi row'a bağlı olmayan
           * özel değişiklikleri aşağıda ayrıca ele alıyoruz.
           */
          const isMissingSnapshot =
            change.fieldName === "__missing_in_snapshot__" ||
            change.fieldName === "__presence__";

          if (!isMissingSnapshot) {
            throw new AppError(
              "Import row could not be found for this change.",
              {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                code: "IMPORT_ROW_NOT_FOUND",
              },
            );
          }
        }

        /* =================================================
           6. YENİ LİSTEDE YOK
           
           Proje kuralı:
           kayıt silinmez,
           pasife alınmaz,
           canlı DB değiştirilmez.
        ================================================= */

        const isMissingSnapshot =
          change.fieldName === "__missing_in_snapshot__" ||
          change.fieldName === "__presence__";

        if (!isMissingSnapshot) {
          /* ===============================================
             COMPANY
          =============================================== */

          if (change.entityType === "COMPANY") {
            /*
             * Yeni firma oluşturma.
             */
            if (
              change.changeType === "CREATED" ||
              change.fieldName === "__entity__"
            ) {
              if (!row?.externalCompanyId) {
                throw new AppError("External company id is required.", {
                  statusCode: HTTP_STATUS.BAD_REQUEST,
                  code: "EXTERNAL_COMPANY_ID_REQUIRED",
                });
              }

              let company = await tx.company.findUnique({
                where: {
                  externalCompanyId: row.externalCompanyId,
                },
              });

              if (!company) {
                company = await tx.company.create({
                  data: {
                    externalCompanyId: row.externalCompanyId,

                    name: row.companyName ?? "",

                    taxNumber: row.taxNumber ?? "",

                    processStatus: row.processStatus,

                    isActive: true,
                  },
                });
              }

              companyId = company.id;
              entityId = company.id;

              await tx.importRow.update({
                where: {
                  id: row.id,
                },
                data: {
                  companyId: company.id,
                },
              });
            } else {
              /*
               * Mevcut firmada tek alan değişikliği.
               */
              const company = await findCompany();

              entityId = company.id;

              if (change.fieldName === "name") {
                await tx.company.update({
                  where: {
                    id: company.id,
                  },
                  data: {
                    name: change.newValue ?? "",
                  },
                });
              } else if (change.fieldName === "taxNumber") {
                await tx.company.update({
                  where: {
                    id: company.id,
                  },
                  data: {
                    taxNumber: change.newValue ?? "",
                  },
                });
              } else if (change.fieldName === "processStatus") {
                await tx.company.update({
                  where: {
                    id: company.id,
                  },
                  data: {
                    processStatus: change.newValue,
                  },
                });
              } else if (change.fieldName === "isActive") {
                await tx.company.update({
                  where: {
                    id: company.id,
                  },
                  data: {
                    isActive: parseBoolean(change.newValue),
                  },
                });
              } else {
                throw new AppError(
                  `Unsupported company field: ${change.fieldName}`,
                  {
                    statusCode: HTTP_STATUS.BAD_REQUEST,
                    code: "UNSUPPORTED_COMPANY_FIELD",
                  },
                );
              }
            }
          } else if (change.entityType === "COMPANY_AUTHORIZATION") {
            /* ===============================================
             COMPANY AUTHORIZATION
          =============================================== */
            const company = await findCompany();

            companyId = company.id;

            /*
             * Yeni authorization kaydı.
             */
            if (
              change.changeType === "CREATED" ||
              change.fieldName === "__entity__"
            ) {
              const authorization = await tx.companyAuthorization.upsert({
                where: {
                  companyId: company.id,
                },
                create: {
                  companyId: company.id,
                  authorizationEndDate: row?.authorizationEndDate ?? null,
                },
                update: {
                  authorizationEndDate: row?.authorizationEndDate ?? null,
                },
              });

              entityId = authorization.id;

              if (row) {
                await tx.importRow.update({
                  where: {
                    id: row.id,
                  },
                  data: {
                    companyId: company.id,
                  },
                });
              }
            } else if (change.fieldName === "authorizationEndDate") {
              /*
               * Mevcut authorization'da
               * tek alan değişikliği.
               */
              const authorization = await tx.companyAuthorization.upsert({
                where: {
                  companyId: company.id,
                },
                create: {
                  companyId: company.id,
                  authorizationEndDate: parseDate(change.newValue),
                },
                update: {
                  authorizationEndDate: parseDate(change.newValue),
                },
              });

              entityId = authorization.id;
            } else {
              throw new AppError(
                `Unsupported company authorization field: ${change.fieldName}`,
                {
                  statusCode: HTTP_STATUS.BAD_REQUEST,
                  code: "UNSUPPORTED_AUTHORIZATION_FIELD",
                },
              );
            }
          } else if (change.entityType === "INCENTIVE_DOCUMENT") {
            /* ===============================================
             INCENTIVE DOCUMENT
          =============================================== */
            /*
             * Yeni belge.
             */
            if (
              change.changeType === "CREATED" ||
              change.fieldName === "__entity__"
            ) {
              if (!row?.externalDocumentId) {
                throw new AppError("External document id is required.", {
                  statusCode: HTTP_STATUS.BAD_REQUEST,
                  code: "EXTERNAL_DOCUMENT_ID_REQUIRED",
                });
              }

              const company = await findCompany();

              companyId = company.id;

              let document = await tx.incentiveDocument.findUnique({
                where: {
                  externalDocumentId: row.externalDocumentId,
                },
              });

              if (!document) {
                document = await tx.incentiveDocument.create({
                  data: {
                    companyId: company.id,

                    externalDocumentId: row.externalDocumentId,

                    documentNumber: row.documentNumber,

                    documentStartDate: row.documentStartDate,

                    documentEndDate: row.documentEndDate,

                    extensionDate: row.extensionDate,

                    supportClass: row.supportClass,

                    isActive: true,
                  },
                });
              }

              documentId = document.id;
              entityId = document.id;

              await tx.importRow.update({
                where: {
                  id: row.id,
                },
                data: {
                  companyId: company.id,
                  documentId: document.id,
                },
              });
            } else {
              /*
               * Mevcut belgede tek alan değişikliği.
               */
              const document = await findDocument();

              documentId = document.id;
              companyId = document.companyId;
              entityId = document.id;

              if (change.fieldName === "documentNumber") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    documentNumber: change.newValue,
                  },
                });
              } else if (change.fieldName === "documentStartDate") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    documentStartDate: parseDate(change.newValue),
                  },
                });
              } else if (change.fieldName === "documentEndDate") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    documentEndDate: parseDate(change.newValue),
                  },
                });
              } else if (change.fieldName === "extensionDate") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    extensionDate: parseDate(change.newValue),
                  },
                });
              } else if (change.fieldName === "supportClass") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    supportClass: change.newValue,
                  },
                });
              } else if (change.fieldName === "isActive") {
                await tx.incentiveDocument.update({
                  where: {
                    id: document.id,
                  },
                  data: {
                    isActive: parseBoolean(change.newValue),
                  },
                });
              } else {
                throw new AppError(
                  `Unsupported incentive document field: ${change.fieldName}`,
                  {
                    statusCode: HTTP_STATUS.BAD_REQUEST,
                    code: "UNSUPPORTED_DOCUMENT_FIELD",
                  },
                );
              }
            }
          } else {
            /* ===============================================
             TANIMSIZ ENTITY
          =============================================== */
            throw new AppError(
              `Unsupported entity type: ${change.entityType}`,
              {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                code: "UNSUPPORTED_ENTITY_TYPE",
              },
            );
          }

          /* ===============================================
             7. CHANGE HISTORY
             
             Canlı veri değiştiyse geçmişe yaz.
          =============================================== */

          if (entityId !== null) {
            await tx.changeHistory.create({
              data: {
                entityType: change.entityType,
                entityId,

                fieldName: change.fieldName,

                oldValue: change.oldValue,
                newValue: change.newValue,

                source: "EXCEL_IMPORT",

                companyId,
                documentId,

                importBatchId,
                changedById: reviewedById,
              },
            });
          }
        }

        /* =================================================
           8. IMPORT CHANGE = APPROVED
        ================================================= */

        const reviewedChange = await tx.importChange.update({
          where: {
            id: change.id,
          },
          data: {
            status: "APPROVED",

            reviewedById,

            reviewedAt: new Date(),

            rejectedReason: null,

            companyId,
            documentId,
          },
        });

        /* =================================================
           9. SAYILARI HESAPLA
        ================================================= */

        const pendingCount = await tx.importChange.count({
          where: {
            importBatchId,
            status: "PENDING",
          },
        });

        const approvedCount = await tx.importChange.count({
          where: {
            importBatchId,
            status: "APPROVED",
          },
        });

        const rejectedCount = await tx.importChange.count({
          where: {
            importBatchId,
            status: "REJECTED",
          },
        });

        /* =================================================
           10. TÜM KARARLAR VERİLDİYSE BATCH TAMAMLA
        ================================================= */

        let batchStatus = batch.status;

        if (pendingCount === 0) {
          const now = new Date();

          const completedBatch = await tx.importBatch.update({
            where: {
              id: importBatchId,
            },
            data: {
              status: "COMPLETED",

              reviewedById,

              reviewedAt: now,

              completedAt: now,
            },
          });

          batchStatus = completedBatch.status;
        }

        return {
          change: reviewedChange,

          summary: {
            pendingCount,
            approvedCount,
            rejectedCount,
          },

          batchStatus,
        };
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  }
}
