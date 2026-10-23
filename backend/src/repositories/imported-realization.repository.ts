
import { prisma } from "../config/env.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface ImportedRealizationRecord {
    externalDocumentId: number;
    externalCompanyId: number;
    externalRowId: string;
    sequenceNumber: number | null;
    itemName: string | null;
    unit: string | null;
    customsRealizedQuantity: string | null;
    rawData: Prisma.InputJsonValue;
}

export class ImportedRealizationRepository {
    async findGroupedByMachine(
        detailId: number | null | undefined,
        machines: {
            id: number;
            sequenceNumber: number | null;
        }[],
    ) {
        const grouped = new Map<
            number,
            {
                externalRowId: string;
                sequenceNumber: number | null;
                itemName: string | null;
                unit: string | null;
                customsRealizedQuantity: string | null;
                rawData: Prisma.JsonValue;
            }[]
        >();

        if (!detailId || machines.length === 0) {
            return grouped;
        }

        const rows = await prisma.documentImportedRealization.findMany({
            where: { detailId },
            orderBy: { externalRowId: "asc" },
        });

        const machineIds = new Set(machines.map((machine) => machine.id));

        const sequenceCounts = new Map<number, number>();

        for (const machine of machines) {
            if (machine.sequenceNumber === null) continue;

            sequenceCounts.set(
                machine.sequenceNumber,
                (sequenceCounts.get(machine.sequenceNumber) ?? 0) + 1,
            );
        }

        const machineBySequence = new Map<number, number>();

        for (const machine of machines) {
            if (
                machine.sequenceNumber !== null &&
                sequenceCounts.get(machine.sequenceNumber) === 1
            ) {
                machineBySequence.set(machine.sequenceNumber, machine.id);
            }
        }

        for (const row of rows) {
            let machineId: number | undefined;

            if (row.machineId !== null && machineIds.has(row.machineId)) {
                machineId = row.machineId;
            } else if (row.sequenceNumber !== null) {
                machineId = machineBySequence.get(row.sequenceNumber);
            }

            if (machineId === undefined) continue;

            const list = grouped.get(machineId) ?? [];

            list.push({
                externalRowId: row.externalRowId,
                sequenceNumber: row.sequenceNumber,
                itemName: row.itemName,
                unit: row.unit,
                customsRealizedQuantity:
                    row.customsRealizedQuantity?.toString() ?? null,
                rawData: row.rawData,
            });

            grouped.set(machineId, list);
        }

        return grouped;
    }

    async findDocument(externalDocumentId: number) {
        return prisma.incentiveDocument.findUnique({
            where: { externalDocumentId },
            select: {
                id: true,
                company: {
                    select: {
                        externalCompanyId: true,
                    },
                },
                detail: {
                    select: {
                        id: true,
                    },
                },
            },
        });
    }

    async findImportedMachines(
        detailId: number,
        sequenceNumber: number | null,
    ) {
        if (sequenceNumber === null) {
            return [];
        }

        return prisma.documentImportedMachine.findMany({
            where: {
                detailId,
                sequenceNumber,
            },
            select: {
                id: true,
                externalMachineId: true,
                name: true,
                unit: true,
            },
        });
    }

    async findExisting(detailId: number, externalRowId: string) {
        return prisma.documentImportedRealization.findUnique({
            where: {
                detailId_externalRowId: {
                    detailId,
                    externalRowId,
                },
            },
        });
    }

    async upsert(
        detailId: number,
        record: ImportedRealizationRecord,
        machineId: number | null,
        externalMachineId: number | null,
    ) {
        const data = {
            machineId,
            externalMachineId,
            sequenceNumber: record.sequenceNumber,
            itemName: record.itemName,
            unit: record.unit,
            customsRealizedQuantity:
                record.customsRealizedQuantity === null
                    ? null
                    : record.customsRealizedQuantity,
            rawData: record.rawData,
        };

        return prisma.documentImportedRealization.upsert({
            where: {
                detailId_externalRowId: {
                    detailId,
                    externalRowId: record.externalRowId,
                },
            },
            create: {
                detailId,
                externalRowId: record.externalRowId,
                ...data,
            },
            update: data,
        });
    }
}
