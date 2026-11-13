
import { apiFetch } from "@/lib/api";

export type PdfRecord = Record<string, unknown>;

export type DocumentPdfData = {
    document: PdfRecord;
    investmentType: string | null;
    products: PdfRecord[];
    supports: PdfRecord[];
    financialInfo: PdfRecord | null;
    realizationInfo: PdfRecord | null;
    domesticMachines: PdfRecord[];
    importedMachines: PdfRecord[];
    specialConditions: PdfRecord[];
};

type ApiResponse = {
    success: boolean;
    data: PdfRecord;
};

function getObject(value: unknown): PdfRecord | null {
    if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    ) {
        return value as PdfRecord;
    }

    return null;
}

function getItems(data: PdfRecord): PdfRecord[] {
    if (!Array.isArray(data.items)) {
        throw new Error("Liste verisi beklenen formatta de─şil.");
    }

    return data.items.filter(
        (item): item is PdfRecord => getObject(item) !== null,
    );
}

export async function fetchDocumentPdfData(
    documentId: string,
    isClosed: boolean,
): Promise<DocumentPdfData> {
    const base = isClosed
        ? `/closed-documents/${documentId}`
        : `/documents/${documentId}`;

    const [
        detailResponse,
        productsResponse,
        supportsResponse,
        financialResponse,
        domesticResponse,
        importedResponse,
        conditionsResponse,
    ] = await Promise.all([
        apiFetch<ApiResponse>(base),
        apiFetch<ApiResponse>(`${base}/products`),
        apiFetch<ApiResponse>(`${base}/supports`),
        apiFetch<ApiResponse>(`${base}/financial-info`),
        apiFetch<ApiResponse>(`${base}/domestic-machines`),
        apiFetch<ApiResponse>(`${base}/imported-machines`),
        apiFetch<ApiResponse>(`${base}/special-conditions`),
    ]);

    const responses = [
        detailResponse,
        productsResponse,
        supportsResponse,
        financialResponse,
        domesticResponse,
        importedResponse,
        conditionsResponse,
    ];

    if (
        responses.some(
            (response) =>
                !response.success || getObject(response.data) === null,
        )
    ) {
        throw new Error("Belge detaylar─▒ eksiksiz al─▒namad─▒.");
    }

    const detail = detailResponse.data;
    console.log("PDF BELGE K├£NYES─░:", {
        city: detail.city,
        district: detail.district,
        address: detail.address,
        osbName: detail.osbName,
        fullData: detail,
    });
    const financial = financialResponse.data;

    return {
        document: detail,

        investmentType:
            typeof detail.investmentType === "string"
                ? detail.investmentType
                : null,

        products: getItems(productsResponse.data),

        supports: getItems(supportsResponse.data),

        financialInfo: getObject(financial.financialInfo),

        realizationInfo: getObject(financial.realizationInfo),

        domesticMachines: getItems(domesticResponse.data),

        importedMachines: getItems(importedResponse.data),

        specialConditions: getItems(conditionsResponse.data),
    };
}
export function getImportedRealizationRows(machines: PdfRecord[]): PdfRecord[] {
    return machines.flatMap((machine) => {
        const realizations = Array.isArray(machine.realizations)
            ? (machine.realizations as PdfRecord[])
            : [];

        return realizations.map((realization) => {
            const rawData = realization.rawData;
            const raw = rawData && typeof rawData === "object" && !Array.isArray(rawData)
                ? (rawData as PdfRecord)
                : {};

            const rowId = typeof realization.externalRowId === "string"
                ? realization.externalRowId
                : "";
            const number = typeof raw.beyannameNumarasi === "string"
                ? raw.beyannameNumarasi.trim()
                : "";
            const date = typeof raw.beyannameTarihi === "string"
                ? raw.beyannameTarihi.trim()
                : "";
            const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(date);

            return {
                machineId: machine.externalMachineId,
                name: machine.name,
                declarationNumber: number || rowId.split(":").slice(1).join(":"),
                declarationDate: iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : date,
                declarationAmount:
                    raw.tutar == null || String(raw.tutar).trim() === ""
                        ? null
                        : raw.tutar,
                realizedQuantity: realization.customsRealizedQuantity,
            };
        });
    });
}
