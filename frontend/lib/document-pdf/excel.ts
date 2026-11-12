
import type { DocumentPdfData, PdfRecord } from "./data";

function text(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
}

function date(value: unknown): string {
    if (!value) return "";
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return text(value);

    return new Intl.DateTimeFormat("tr-TR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(parsed);
}

function amount(value: unknown): number | string {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(String(value));
    return Number.isFinite(number) ? number : text(value);
}

export async function generateDocumentExcel(
    data: DocumentPdfData,
): Promise<void> {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Teşvik Akkaş";
    workbook.created = new Date();

    type ExcelValue = string | number;
    type ExcelColumn = {
        header: string;
        key: string;
        width?: number;
    };

    const addSheet = (
        name: string,
        columns: ExcelColumn[],
        rows: Record<string, ExcelValue>[],
    ) => {
        const sheet = workbook.addWorksheet(name);

        sheet.columns = columns.map((column) => ({
            ...column,
            width: column.width ?? 20,
        }));

        rows.forEach((row) => sheet.addRow(row));

        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length },
        };

        const header = sheet.getRow(1);
        header.font = { bold: true, color: { argb: "FFFFFFFF" } };
        header.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E2A5E" },
        };
        header.alignment = { vertical: "middle", wrapText: true };
        header.height = 30;

        sheet.eachRow((row, index) => {
            if (index === 1) return;
            row.alignment = { vertical: "top", wrapText: true };

            if (index % 2 === 0) {
                row.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF1F5F9" },
                };
            }
        });

        return sheet;
    };

    const columns = (
        definitions: [string, string, number?][],
    ): ExcelColumn[] =>
        definitions.map(([key, header, width]) => ({
            key,
            header,
            width,
        }));

    const mapRows = (
        records: PdfRecord[],
        keys: string[],
    ): Record<string, ExcelValue>[] =>
        records.map((record) =>
            Object.fromEntries(
                keys.map((key) => [key, text(record[key])]),
            ),
        );

    addSheet(
        "Yatırım Cinsi",
        columns([["investmentType", "Yatırım Cinsi", 45]]),
        [{ investmentType: text(data.investmentType) }],
    );

    const productColumns = columns([
        ["productName", "Ürün Adı", 40],
        ["us97Code", "US97 Kodu", 20],
        ["us97Description", "US97 Açıklaması", 40],
        ["naceCode", "NACE Kodu", 20],
        ["naceDescription", "NACE Açıklaması", 40],
        ["unit", "Birim", 18],
        ["existingCapacity", "Mevcut Kapasite", 20],
        ["additionalCapacity", "İlave Kapasite", 20],
        ["totalCapacity", "Toplam Kapasite", 20],
    ]);

    addSheet(
        "Ürün Bilgileri",
        productColumns,
        mapRows(data.products, productColumns.map((c) => c.key)),
    );

    const supportColumns = columns([
        ["supportType", "Destek Türü", 35],
        ["supportRate", "Destek Oranı", 20],
        ["supportDescription", "Açıklama", 55],
    ]);

    addSheet(
        "Destek Unsurları",
        supportColumns,
        mapRows(data.supports, supportColumns.map((c) => c.key)),
    );


    const f = data.financialInfo ?? {};
    const r = data.realizationInfo ?? {};

    const toNum = (v: unknown): number | null => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(String(v));
        return Number.isFinite(n) ? n : null;
    };

    const sum = (a: unknown, b: unknown): number | string => {
        const x = toNum(a);
        const y = toNum(b);
        return x === null && y === null ? "" : (x ?? 0) + (y ?? 0);
    };

    const remaining = (planned: unknown, realized: unknown): number | string => {
        const p = toNum(planned);
        const r = toNum(realized);
        return p === null || r === null ? "" : p - r;
    };

    const financeItems = [
        {
            name: "Arazi-Arsa",
            planned: f.landCost,
            realized: r.totalLandRealization,
        },
        {
            name: "Bina-İnşaat",
            planned: f.totalBuildingConstructionExpenses,
            realized: r.totalBuildingRealization,
        },
        {
            name: "Makine-Teçhizat",
            planned: f.totalMachineryExpenses,
            realized: sum(r.domesticRealization, r.importedRealization),
        },
        {
            name: "Diğer Yatırım Harcamaları",
            planned: f.otherInvestmentExpenses,
            realized: r.totalOtherInvestmentRealization,
        },
        {
            name: "Toplam Sabit Yatırım",
            planned: f.totalInvestment,
            realized: r.totalRealizedAmount,
        },
    ];

    const financeSheet = addSheet(
        "Finansal Bilgiler",
        columns([
            ["name", "Yatırım Kalemi", 42],
            ["planned", "Öngörülen (TL)", 24],
            ["realized", "Gerçekleşen (TL)", 24],
            ["remaining", "Kalan (TL)", 24],
        ]),
        financeItems.map((item) => ({
            name: item.name,
            planned: amount(item.planned),
            realized: amount(item.realized),
            remaining: remaining(item.planned, item.realized),
        })),
    );

    for (const column of ["B", "C", "D"]) {
        financeSheet.getColumn(column).numFmt = '#,##0.00';
    }


    const domesticRows: Record<string, ExcelValue>[] = [];

    for (const machine of data.domesticMachines) {
        const realizations = Array.isArray(machine.realizations)
            ? machine.realizations as PdfRecord[]
            : [];

        const invoices = realizations.length ? realizations : [{}];

        for (const invoice of invoices) {
            domesticRows.push({
                sequenceNumber: text(machine.sequenceNumber),
                machineId: text(machine.externalMachineId),
                gtipCode: text(machine.gtipCode),
                name: text(machine.name),
                quantity: amount(machine.quantity),
                unit: text(machine.unit),
                unitPrice: amount(machine.unitPriceTl),
                sellerName: text(invoice.sellerName),
                invoiceNumber: text(invoice.invoiceNumber),
                invoiceDate: date(invoice.invoiceDate),
                invoiceAmount: amount(invoice.invoiceValue),
                total: amount(machine.totalTl),
                realizedQuantity: amount(machine.invoiceRealizedQuantity),
            });
        }
    }

    const domesticSheet = addSheet(
        "Yerli Makine Listesi",
        columns([
            ["sequenceNumber", "Sıra No", 12],
            ["machineId", "Makine ID", 16],
            ["gtipCode", "GTİP No", 20],
            ["name", "Adı ve Özelliği", 55],
            ["quantity", "Miktar", 16],
            ["unit", "Birim", 15],
            ["unitPrice", "Birim Fiyat (TL)", 22],
            ["sellerName", "Satıcı", 40],
            ["invoiceNumber", "Fatura No.", 24],
            ["invoiceDate", "Fatura Tarihi", 19],
            ["invoiceAmount", "Fatura Tutarı", 23],
            ["total", "Tutar (KDV Hariç)", 24],
            ["realizedQuantity", "Fatura Gerç. Miktar", 23],
        ]),
        domesticRows,
    );

    for (const column of ["G", "K", "L"]) {
        domesticSheet.getColumn(column).numFmt = '#,##0.00';
    }

    const importedColumns = columns([
        ["sequenceNumber", "Sıra No", 12],
        ["externalMachineId", "Makine ID", 16],
        ["name", "Adı ve Özelliği", 55],
        ["gtipCode", "GTİP No", 20],
        ["quantity", "Miktar", 16],
        ["unit", "Birim", 15],
        ["usedMachine", "Kullanılmış Makine", 23],
        ["originCurrencyFob", "Döviz Birimi", 20],
        ["originCurrencyFobAmount", "FOB Birim Fiyatı", 22],
        ["totalFobUsd", "Toplam FOB USD", 22],
        ["totalFobTl", "Toplam FOB TL", 22],
    ]);

    addSheet(
        "İthal Makine Listesi",
        importedColumns,
        mapRows(data.importedMachines, importedColumns.map((c) => c.key)),
    );

    const conditionColumns = columns([
        ["conditionName", "Özel Şart", 45],
        ["description", "Açıklama", 80],
    ]);

    addSheet(
        "Özel Şartlar",
        conditionColumns,
        mapRows(data.specialConditions, conditionColumns.map((c) => c.key)),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const docNo = text(data.document.documentNumber)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    link.href = url;
    link.download = `Tesvik_Belgesi_${docNo}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
