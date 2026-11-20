/*
 * ==================================================================
 * [20.11.2026] YENİ DOSYA – Belge kapanınca açık detayı kapalı belgeye taşır
 * ------------------------------------------------------------------
 * Sorun: Belge önce açıkken sisteme giriyor, makine/beyanname verisi açık kaydın
 * detayına yazılıyordu. Belge kapanınca kapalı kayıt açılıyor ama veri açıkta kalıyordu.
 * Sonuç: aynı belge iki tabloda, veri ikiye bölünmüş (örnek 515592 Ağaoğlu: 0 makine).
 *
 * moveOpenDetailToClosedDocument():
 *   1. Açık belgenin detay kaydını kapalı belgeye bağlar (silmez, ID’ler korunur).
 *   2. Kapalı tarafta önceden açılmış detay varsa birleştirir: gerçekleşme özeti
 *      kapalı taraftaki (kapanıştaki son hal) tutulur, tekrar eden beyannameler silinir.
 *   3. Açık kaydı pasife alır (isActive=false, status=kapalı kaydınki).
 *   4. Bağlantısız ithal beyannameleri makineye bağlar.
 *   5. Yaptıklarını ChangeHistory tablosuna yazar (source=SYSTEM).
 *   Tekrar çalıştırılabilir. Kapalı detayda beklenmeyen veri varsa CLOSED_DETAIL_CONFLICT
 *   hatasıyla durur, tahmin yürütmez.
 *
 * linkImportedRealizations(): Önce e-TUYS makine ID, yoksa tekil Sıra No ile bağlar.
 *
 * Kullanıldığı yerler: approval.service.ts, document-detail-import.service.ts
 * Canlıdaki 51 belge 20.11.2026’da aynı mantıktaki SQL script’iyle düzeltildi.
 * Ayrıntı: DEGISIKLIKLER-2026-11-20.md
 * ==================================================================
 */

import type { Prisma } from "../generated/prisma/client.js";

import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

/*
 * Belge e-TUYS'ta kapandığında:
 *   - Açık belgenin detay kaydı (makineler, gerçekleşmeler, ürünler...)
 *     kapalı belgeye bağlanır. Hiçbir kayıt silinip yeniden oluşturulmaz,
 *     ID'ler ve makine–gerçekleşme bağlantıları korunur.
 *   - Kapalı belgede önceden açılmış bir detay varsa, içindeki
 *     gerçekleşme özeti ve ithal gerçekleşmeler birleşik detaya alınır.
 *   - Açık belge kaydı pasife alınır.
 *   - Bağlantısız ithal gerçekleşmeler makineye bağlanır.
 *
 * Fonksiyon tekrar çalıştırılabilir: iş zaten yapılmışsa hiçbir şey değiştirmez.
 */

type Tx = Prisma.TransactionClient;

type TransitionOptions = {
  changedById?: number | null;
  importBatchId?: number | null;
};

export type ClosedDocumentTransitionResult = {
  detailMoved: boolean;
  openDeactivated: boolean;
  linkedRealizationCount: number;
};

const NOTHING_DONE: ClosedDocumentTransitionResult = {
  detailMoved: false,
  openDeactivated: false,
  linkedRealizationCount: 0,
};

export async function moveOpenDetailToClosedDocument(
  tx: Tx,
  externalDocumentId: number,
  options: TransitionOptions = {},
): Promise<ClosedDocumentTransitionResult> {
  const [openDocument, closedDocument] = await Promise.all([
    tx.incentiveDocument.findUnique({
      where: { externalDocumentId },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        status: true,
        detail: { select: { id: true } },
      },
    }),
    tx.closedIncentiveDocument.findUnique({
      where: { externalDocumentId },
      select: {
        id: true,
        companyId: true,
        status: true,
        detail: { select: { id: true } },
      },
    }),
  ]);

  // Belge iki tabloda birden yoksa yapılacak bir şey yok.
  if (!openDocument || !closedDocument) {
    return NOTHING_DONE;
  }

  if (openDocument.companyId !== closedDocument.companyId) {
    throw new AppError(
      `Belge ${externalDocumentId}: açık ve kapalı kayıtların firması farklı. Manuel kontrol gerekli.`,
      {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "CLOSED_DOCUMENT_COMPANY_MISMATCH",
      },
    );
  }

  const history: Prisma.ChangeHistoryCreateManyInput[] = [];

  const addHistory = (
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
  ) => {
    history.push({
      entityType: "INCENTIVE_DOCUMENT",
      entityId: openDocument.id,
      fieldName,
      oldValue,
      newValue,
      source: "SYSTEM",
      companyId: openDocument.companyId,
      documentId: openDocument.id,
      importBatchId: options.importBatchId ?? null,
      changedById: options.changedById ?? null,
    });
  };

  let detailMoved = false;
  let detailId: number | null = closedDocument.detail?.id ?? null;

  /* -------------------------------------------------------
     1. Açık detayı kapalı belgeye taşı
     ------------------------------------------------------- */
  if (openDocument.detail) {
    const openDetailId = openDocument.detail.id;

    if (closedDocument.detail) {
      await mergeClosedDetailInto(
        tx,
        externalDocumentId,
        closedDocument.detail.id,
        openDetailId,
      );
    }

    await tx.documentDetail.update({
      where: { id: openDetailId },
      data: {
        documentId: null,
        closedDocumentId: closedDocument.id,
      },
    });

    addHistory(
      "detail",
      `documentId=${openDocument.id}`,
      `closedDocumentId=${closedDocument.id}`,
    );

    detailMoved = true;
    detailId = openDetailId;
  }

  /* -------------------------------------------------------
     2. Açık belge kaydını pasife al
     ------------------------------------------------------- */
  const openDeactivated =
    openDocument.isActive || openDocument.status !== closedDocument.status;

  if (openDeactivated) {
    await tx.incentiveDocument.update({
      where: { id: openDocument.id },
      data: {
        isActive: false,
        status: closedDocument.status,
      },
    });

    if (openDocument.isActive) {
      addHistory("isActive", "true", "false");
    }

    if (openDocument.status !== closedDocument.status) {
      addHistory("status", openDocument.status, closedDocument.status);
    }
  }

  /* -------------------------------------------------------
     3. Bağlantısız ithal gerçekleşmeleri makineye bağla
     ------------------------------------------------------- */
  const linkedRealizationCount =
    detailId !== null ? await linkImportedRealizations(tx, detailId) : 0;

  if (history.length > 0) {
    await tx.changeHistory.createMany({ data: history });
  }

  return { detailMoved, openDeactivated, linkedRealizationCount };
}

/*
 * Kapalı belgede önceden oluşmuş detayı açık detayla birleştirir ve siler.
 * Kapalı detayda sadece gerçekleşme özeti ve ithal gerçekleşme bekleniyor;
 * başka veri varsa işlem durur (otomatik karar verilmez).
 */
async function mergeClosedDetailInto(
  tx: Tx,
  externalDocumentId: number,
  closedDetailId: number,
  openDetailId: number,
) {
  const where = { detailId: closedDetailId };

  const [
    products,
    supports,
    financialInfos,
    specialConditions,
    domesticMachines,
    domesticRealizations,
    importedMachines,
  ] = await Promise.all([
    tx.documentProduct.count({ where }),
    tx.documentSupport.count({ where }),
    tx.documentFinancialInfo.count({ where }),
    tx.documentSpecialCondition.count({ where }),
    tx.documentDomesticMachine.count({ where }),
    tx.documentDomesticRealization.count({ where }),
    tx.documentImportedMachine.count({ where }),
  ]);

  const unexpected =
    products +
    supports +
    financialInfos +
    specialConditions +
    domesticMachines +
    domesticRealizations +
    importedMachines;

  if (unexpected > 0) {
    throw new AppError(
      `Belge ${externalDocumentId}: kapalı belgenin detayında beklenmeyen veri var (${unexpected} kayıt). Otomatik birleştirme yapılmadı, manuel kontrol gerekli.`,
      {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "CLOSED_DETAIL_CONFLICT",
      },
    );
  }

  // Gerçekleşme özeti: kapalı taraftaki (kapanıştaki son hal) tutulur.
  const closedRealizationInfo = await tx.documentRealizationInfo.findUnique({
    where: { detailId: closedDetailId },
    select: { id: true },
  });

  if (closedRealizationInfo) {
    await tx.documentRealizationInfo.deleteMany({
      where: { detailId: openDetailId },
    });

    await tx.documentRealizationInfo.update({
      where: { id: closedRealizationInfo.id },
      data: { detailId: openDetailId },
    });
  }

  // İthal gerçekleşmeler: açık tarafta zaten olanlar silinir, olmayanlar taşınır.
  const [closedRows, openRows] = await Promise.all([
    tx.documentImportedRealization.findMany({
      where: { detailId: closedDetailId },
      select: { id: true, externalRowId: true },
    }),
    tx.documentImportedRealization.findMany({
      where: { detailId: openDetailId },
      select: { externalRowId: true },
    }),
  ]);

  const openRowIds = new Set(openRows.map((row) => row.externalRowId));

  const duplicateIds = closedRows
    .filter((row) => openRowIds.has(row.externalRowId))
    .map((row) => row.id);

  const moveIds = closedRows
    .filter((row) => !openRowIds.has(row.externalRowId))
    .map((row) => row.id);

  if (duplicateIds.length > 0) {
    await tx.documentImportedRealization.deleteMany({
      where: { id: { in: duplicateIds } },
    });
  }

  if (moveIds.length > 0) {
    await tx.documentImportedRealization.updateMany({
      where: { id: { in: moveIds } },
      data: { detailId: openDetailId, machineId: null },
    });
  }

  // Artık boş olan kapalı detay kaydını sil (closedDocumentId boşalsın).
  await tx.documentDetail.delete({ where: { id: closedDetailId } });
}

/*
 * machineId'si boş ithal gerçekleşmeleri aynı detaydaki makineye bağlar.
 * Önce e-TUYS makine ID'si, yoksa Sıra No kullanılır.
 * Sıra No ile sadece o sırada TEK makine varsa bağlanır.
 */
export async function linkImportedRealizations(
  tx: Tx,
  detailId: number,
): Promise<number> {
  const [machines, rows] = await Promise.all([
    tx.documentImportedMachine.findMany({
      where: { detailId },
      select: { id: true, externalMachineId: true, sequenceNumber: true },
    }),
    tx.documentImportedRealization.findMany({
      where: { detailId, machineId: null },
      select: { id: true, externalMachineId: true, sequenceNumber: true },
    }),
  ]);

  if (machines.length === 0 || rows.length === 0) {
    return 0;
  }

  const uniqueBy = <K>(getKey: (m: (typeof machines)[number]) => K | null) => {
    const counts = new Map<K, number>();
    for (const machine of machines) {
      const key = getKey(machine);
      if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const map = new Map<K, (typeof machines)[number]>();
    for (const machine of machines) {
      const key = getKey(machine);
      if (key !== null && counts.get(key) === 1) map.set(key, machine);
    }
    return map;
  };

  const byExternalId = uniqueBy((m) => m.externalMachineId);
  const bySequence = uniqueBy((m) => m.sequenceNumber);

  let linked = 0;

  for (const row of rows) {
    const machine =
      (row.externalMachineId !== null
        ? byExternalId.get(row.externalMachineId)
        : undefined) ??
      (row.externalMachineId === null && row.sequenceNumber !== null
        ? bySequence.get(row.sequenceNumber)
        : undefined);

    if (!machine) continue;

    await tx.documentImportedRealization.update({
      where: { id: row.id },
      data: {
        machineId: machine.id,
        externalMachineId: row.externalMachineId ?? machine.externalMachineId,
      },
    });

    linked += 1;
  }

  return linked;
}
