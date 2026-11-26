import { prisma } from "../config/env.js";
import type { Prisma } from "../generated/prisma/client.js";

type NotePayload = {
    id: number;
    text: string;
    createdAt: Date;
    updatedAt: Date;
    company: {
        name: string;
    };
    author: {
        email: string | null;
        role: string;
    } | null;
};

export async function queueKokpitCompanyNote(
    tx: Prisma.TransactionClient,
    note: NotePayload,
) {
    if (!note.author?.email) return;

    if (!["ADMIN", "OPERATION"].includes(note.author.role)) {
        return;
    }

    await tx.kokpitReportOutbox.createMany({
        data: [
            {
                sourceId: `COMPANY-NOTE-${note.id}`,
                authorEmail: note.author.email.trim().toLowerCase(),
                companyName: note.company.name,
                note: note.text,
                activityAt: note.createdAt,
                sourceUpdatedAt: note.updatedAt,
            },
        ],
        skipDuplicates: true,
    });
}

class KokpitReportIntegrationService {
    private timer: ReturnType<typeof setInterval> | null = null;
    private running: Promise<void> | null = null;

    start() {
        if (this.timer) return;

        if (
            process.env.KOKPIT_INTEGRATION_ENABLED !== "true" ||
            !process.env.KOKPIT_INTEGRATION_URL ||
            !process.env.KOKPIT_INTEGRATION_API_KEY
        ) {
            console.log("[Kokpit Integration] Devre disi.");
            return;
        }

        console.log("[Kokpit Integration] Baslatildi.");

        this.timer = setInterval(() => {
            this.tick();
        }, 3000);

        this.tick();
    }

    private tick() {
        if (this.running) return;

        this.running = this.processQueue()
            .catch(() => {
                console.error(
                    "[Kokpit Integration] Kuyruk isleme hatasi.",
                );
            })
            .finally(() => {
                this.running = null;
            });
    }

    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        await this.running;
    }

    private async processQueue() {
        const url = process.env.KOKPIT_INTEGRATION_URL;
        const apiKey = process.env.KOKPIT_INTEGRATION_API_KEY;

        if (!url || !apiKey) return;

        const records = await prisma.kokpitReportOutbox.findMany({
            where: {
                sentAt: null,
                nextAttemptAt: {
                    lte: new Date(),
                },
            },
            orderBy: { id: "asc" },
            take: 20,
        });

        for (const record of records) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    redirect: "error",
                    headers: {
                        "Content-Type": "application/json",
                        "x-integration-key": apiKey,
                    },
                    body: JSON.stringify({
                        sourceId: record.sourceId,
                        authorEmail: record.authorEmail,
                        companyName: record.companyName,
                        note: record.note,
                        activityAt: record.activityAt.toISOString(),
                        sourceUpdatedAt:
                            record.sourceUpdatedAt.toISOString(),
                    }),
                    signal: AbortSignal.timeout(10000),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = (await response.json()) as {
                    success?: boolean;
                    action?: string;
                };

                if (result.success !== true) {
                    throw new Error("Kokpit aktarimi onaylamadi.");
                }

                await prisma.kokpitReportOutbox.updateMany({
                    where: {
                        id: record.id,
                        sentAt: null,
                    },
                    data: {
                        sentAt: new Date(),
                        lastError: null,
                        attempts: { increment: 1 },
                    },
                });

                console.log(
                    `[Kokpit Integration] ${record.sourceId}: ${result.action ?? "OK"}`,
                );
            } catch (error) {
                const attempts = record.attempts + 1;

                const delay = Math.min(
                    300000,
                    10000 * Math.pow(2, Math.min(attempts - 1, 5)),
                );

                await prisma.kokpitReportOutbox.updateMany({
                    where: {
                        id: record.id,
                        sentAt: null,
                    },
                    data: {
                        attempts: { increment: 1 },
                        lastError:
                            error instanceof Error
                                ? error.message.slice(0, 500)
                                : "Unknown error",
                        nextAttemptAt: new Date(Date.now() + delay),
                    },
                });

                console.error(
                    `[Kokpit Integration] ${record.sourceId}: Gonderim basarisiz.`,
                );
            }
        }
    }
}

export const kokpitReportIntegrationService =
    new KokpitReportIntegrationService();