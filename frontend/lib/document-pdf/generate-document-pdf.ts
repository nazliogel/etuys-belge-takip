import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DocumentPdfData, PdfRecord } from "./data";

// ---------------------------------------------------------------------------
// Sayfa ve renk sabitleri (A4 yatay, mm)
// ---------------------------------------------------------------------------
const FONT = "NotoSans";
const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const LEFT = 14;
const RIGHT = 14;
const USABLE = PAGE_WIDTH - LEFT - RIGHT;

const CONTENT_TOP = 20; // 2. sayfadan itibaren içerik başlangıcı (üstte sayfa başlığı var)
const CONTENT_BOTTOM = 187; // bunun altı alt bilgiye ayrılmış

type RGB = [number, number, number];
const NAVY: RGB = [30, 42, 94];
const NAVY_SOFT: RGB = [232, 236, 246];
const RED: RGB = [200, 16, 46];
const INK: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const ZEBRA: RGB = [248, 250, 252];
const LABEL_BG: RGB = [244, 246, 250];
const ON_NAVY_MUTED: RGB = [199, 210, 254];
const WHITE: RGB = [255, 255, 255];

const MONEY = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const QUANTITY = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });
const TODAY = () =>
    new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

// NotoSans-Bold.ttf public/fonts altında varsa kalın yazı kullanılır; yoksa normal fonta düşer.
let BOLD: "bold" | "normal" = "normal";

type Align = "left" | "center" | "right";
type Column = {
    key: string;
    label: string;
    width?: number;
    money?: boolean;
    quantity?: boolean;
    align?: Align;
    negativeRed?: boolean; // "-1.234,00" gibi negatif değerleri kırmızı yaz
};
type TableOptions = {
    noHead?: boolean; // anahtar/değer tablolarında "Bilgi | Değer" başlığı gereksiz
    labelColumn?: boolean; // ilk sütunu etiket gibi (gri zemin) göster
    emphasizeRow?: (rowIndex: number) => boolean; // toplam satırı vb.
    tableWidth?: number; // verilmezse tam genişlik
};

// ---------------------------------------------------------------------------
// Değer biçimlendirme
// ---------------------------------------------------------------------------
function value(v: unknown): string {
    if (v === null || v === undefined || v === "") return "-";
    return typeof v === "string" || typeof v === "number" ? String(v) : "-";
}
function decimal(v: unknown, money = false): string {
    if (v === null || v === undefined || v === "") return "-";
    const raw = String(v).trim();
    const num = Number(raw.replace(",", "."));
    if (!Number.isFinite(num)) return raw || "-";
    return money ? MONEY.format(num) : QUANTITY.format(num);
}
function shortUnit(v: unknown): string {
    return value(v).replace(/\s*\([^)]*\)\s*$/, "");
}
function flag(v: unknown): string {
    if (v === null || v === undefined || v === "") return "-";
    if (String(v) === "1") return "EVET";
    if (String(v) === "0") return "HAYIR";
    return value(v);
}
function company(record: PdfRecord): PdfRecord {
    const c = record.company;
    return c && typeof c === "object" && !Array.isArray(c) ? (c as PdfRecord) : {};
}
function number(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------
async function fetchFontBase64(path: string): Promise<string | null> {
    try {
        const response = await fetch(path);
        if (!response.ok) return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        return btoa(binary);
    } catch {
        return null;
    }
}

async function loadFonts(pdf: jsPDF): Promise<void> {
    const regular = await fetchFontBase64("/fonts/NotoSans-Regular.ttf");
    if (!regular) throw new Error("PDF için NotoSans-Regular.ttf bulunamadı.");
    pdf.addFileToVFS("NotoSans-Regular.ttf", regular);
    pdf.addFont("NotoSans-Regular.ttf", FONT, "normal");

    const bold = await fetchFontBase64("/fonts/NotoSans-Bold.ttf");
    if (bold) {
        pdf.addFileToVFS("NotoSans-Bold.ttf", bold);
        pdf.addFont("NotoSans-Bold.ttf", FONT, "bold");
        BOLD = "bold";
    } else {
        BOLD = "normal";
    }
    pdf.setFont(FONT, "normal");
}

function font(pdf: jsPDF, weight: "normal" | "bold", size: number, color: RGB) {
    pdf.setFont(FONT, weight === "bold" ? BOLD : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
}

// ---------------------------------------------------------------------------
// Sayfa yerleşimi
// ---------------------------------------------------------------------------
function checkSpace(pdf: jsPDF, y: number, needed = 20): number {
    if (y + needed <= CONTENT_BOTTOM) return y;
    pdf.addPage();
    pdf.setFont(FONT, "normal");
    return CONTENT_TOP;
}

/** İlk sayfadaki lacivert kapak bandı + firma adı. İçeriğin başlayacağı y'yi döner. */
function drawCover(pdf: jsPDF, companyName: string, docNumber: string): number {
    const bandHeight = 30;
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, PAGE_WIDTH, bandHeight, "F");
    pdf.setFillColor(...RED);
    pdf.rect(0, bandHeight, PAGE_WIDTH, 1.2, "F");

    font(pdf, "bold", 17, WHITE);
    pdf.text("YATIRIM TEŞVİK BELGESİ", LEFT, 14);
    font(pdf, "normal", 8.5, ON_NAVY_MUTED);
    pdf.text("Bilgi ve Detay Raporu  ·  Resmî belge değildir", LEFT, 21);

    const right = PAGE_WIDTH - RIGHT;
    font(pdf, "normal", 7.5, ON_NAVY_MUTED);
    pdf.text("BELGE NO", right, 10.5, { align: "right" });
    font(pdf, "bold", 13, WHITE);
    pdf.text(docNumber, right, 17.5, { align: "right" });
    font(pdf, "normal", 7.5, ON_NAVY_MUTED);
    pdf.text(`Oluşturulma: ${TODAY()}`, right, 24, { align: "right" });

    let y = bandHeight + 10;
    font(pdf, "normal", 7.5, MUTED);
    pdf.text("FİRMA", LEFT, y);
    y += 6;
    font(pdf, "bold", 13, INK);
    const lines = pdf.splitTextToSize(companyName, USABLE);
    pdf.text(lines, LEFT, y);
    return y + (lines.length - 1) * 5.5 + 9;
}

/** 2. sayfadan itibaren her sayfanın üstündeki ince başlık satırı. */
function drawRunningHeader(pdf: jsPDF, docNumber: string, companyName: string) {
    font(pdf, "bold", 7.5, NAVY);
    pdf.text("YATIRIM TEŞVİK BELGESİ", LEFT, 10);
    const titleWidth = pdf.getTextWidth("YATIRIM TEŞVİK BELGESİ");

    font(pdf, "normal", 7.5, MUTED);
    const maxCompanyWidth = USABLE - titleWidth - 60;
    const shortCompany = pdf.splitTextToSize(companyName, maxCompanyWidth)[0] as string;
    pdf.text(`·  ${shortCompany}`, LEFT + titleWidth + 2, 10);
    pdf.text(`Belge No: ${docNumber}`, PAGE_WIDTH - RIGHT, 10, { align: "right" });

    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(LEFT, 13, PAGE_WIDTH - RIGHT, 13);
}

function drawFooter(pdf: jsPDF, page: number, totalPages: number) {
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(LEFT, PAGE_HEIGHT - 16, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 16);
    font(pdf, "normal", 7.2, MUTED);
    pdf.text(
        "Bu doküman yalnızca bilgilendirme amaçlıdır; resmî yatırım teşvik belgesi yerine geçmez.",
        LEFT,
        PAGE_HEIGHT - 10,
    );
    pdf.text(`Sayfa ${page} / ${totalPages}`, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 10, { align: "right" });
}

/** Numaralı bölüm başlığı: lacivert rozet + kalın başlık + sağa uzanan ince çizgi. */
function section(pdf: jsPDF, no: string, title: string, currentY: number): number {
    // Başlık ile tablonun başlığı + en az bir satırı aynı sayfada kalsın.
    const y = checkSpace(pdf, currentY + 2, 34);

    pdf.setFillColor(...NAVY);
    pdf.roundedRect(LEFT, y, 7, 7, 1.2, 1.2, "F");
    font(pdf, "bold", 8.5, WHITE);
    pdf.text(no, LEFT + 3.5, y + 4.9, { align: "center" });

    font(pdf, "bold", 11.5, NAVY);
    pdf.text(title, LEFT + 10, y + 5.2);
    const titleEnd = LEFT + 10 + pdf.getTextWidth(title) + 3;

    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.3);
    pdf.line(titleEnd, y + 3.5, PAGE_WIDTH - RIGHT, y + 3.5);
    return y + 11;
}

/** Bölüm içi alt başlık: kırmızı küçük işaret + kalın metin. */
function subheading(pdf: jsPDF, title: string, currentY: number): number {
    const y = checkSpace(pdf, currentY, 26);
    pdf.setFillColor(...RED);
    pdf.rect(LEFT, y + 1, 1, 4, "F");
    font(pdf, "bold", 8.5, INK);
    pdf.text(title, LEFT + 3, y + 4.3);
    return y + 7.5;
}

function emptyState(pdf: jsPDF, y: number): number {
    pdf.setFillColor(...ZEBRA);
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(LEFT, y, USABLE, 9, 1.5, 1.5, "FD");
    font(pdf, "normal", 8, MUTED);
    pdf.text("Bu bölümde kayıt bulunmuyor.", LEFT + 4, y + 5.8);
    return y + 14;
}

// ---------------------------------------------------------------------------
// Tablolar
// ---------------------------------------------------------------------------
function table(
    pdf: jsPDF,
    columns: Column[],
    rows: PdfRecord[],
    currentY: number,
    options: TableOptions = {},
): number {
    const y = checkSpace(pdf, currentY, 16);
    if (!rows.length) return emptyState(pdf, y);

    const widths = columns.reduce((sum, col) => sum + (col.width ?? 0), 0);
    if (widths > USABLE + 0.01) throw new Error("PDF tablosunun sütun genişlikleri A4 yatay sayfayı aşıyor.");

    const dense = columns.length > 8;
    const alignOf = (c: Column): Align => c.align ?? (c.money || c.quantity ? "right" : "left");

    autoTable(pdf, {
        startY: y,
        head: options.noHead ? undefined : [columns.map((c) => c.label)],
        body: rows.map((row) =>
            columns.map((c) => {
                const v = row[c.key];
                return c.money ? decimal(v, true) : c.quantity ? decimal(v) : value(v);
            }),
        ),
        theme: "grid",
        margin: { left: LEFT, right: RIGHT, top: CONTENT_TOP, bottom: PAGE_HEIGHT - CONTENT_BOTTOM + 5 },
        styles: {
            font: FONT,
            fontStyle: "normal",
            fontSize: dense ? 6.6 : 8,
            cellPadding: dense
                ? { top: 1.3, bottom: 1.3, left: 1.5, right: 1.5 }
                : { top: 1.9, bottom: 1.9, left: 2.4, right: 2.4 },
            overflow: "linebreak",
            valign: "middle",
            textColor: INK,
            lineColor: LINE,
            lineWidth: 0.15,
        },
        headStyles: {
            fillColor: NAVY,
            textColor: WHITE,
            font: FONT,
            fontStyle: BOLD,
            fontSize: dense ? 6.4 : 7.6,
            valign: "middle",
            lineColor: NAVY,
        },
        alternateRowStyles: { fillColor: ZEBRA },
        columnStyles: Object.fromEntries(columns.map((c, i) => [i, c.width ? { cellWidth: c.width } : {}])),
        tableWidth: options.tableWidth ?? "auto",
        showHead: "everyPage",
        rowPageBreak: "avoid",
        didParseCell: (cell) => {
            const col = columns[cell.column.index];
            if (!col) return;
            cell.cell.styles.halign = alignOf(col);

            if (cell.section !== "body") return;

            if (options.labelColumn && cell.column.index === 0) {
                cell.cell.styles.fillColor = LABEL_BG;
                cell.cell.styles.textColor = MUTED;
            }
            if (col.negativeRed) {
                const text = String(cell.cell.raw ?? "");
                if (/^-\d/.test(text)) cell.cell.styles.textColor = RED;
            }
            if (options.emphasizeRow?.(cell.row.index)) {
                cell.cell.styles.fillColor = NAVY_SOFT;
                cell.cell.styles.fontStyle = BOLD;
                if (!(col.negativeRed && /^-\d/.test(String(cell.cell.raw ?? "")))) {
                    cell.cell.styles.textColor = NAVY;
                }
            }
        },
    });
    return ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;
}

/** Anahtar/değer tablosu: başlıksız, etiket sütunu gri zeminli. */
function pairs(
    pdf: jsPDF,
    rows: [string, unknown][],
    y: number,
    align: Align = "left",
    tableWidth?: number,
): number {
    return table(
        pdf,
        [
            { key: "label", label: "Bilgi", width: 90 },
            { key: "value", label: "Değer", align },
        ],
        rows.map(([label, raw]) => ({ label, value: raw ?? "-" })),
        y,
        { noHead: true, labelColumn: true, tableWidth },
    );
}

function financeRow(name: string, planned: unknown, realized: unknown): PdfRecord {
    const p = number(planned);
    const r = number(realized);
    return {
        name,
        planned: decimal(planned, true),
        realized: decimal(realized, true),
        remaining: p === null || r === null ? "-" : MONEY.format(p - r),
    };
}
function financeDetails(title: string, pdf: jsPDF, rows: [string, unknown][], y: number): number {
    y = subheading(pdf, title, y);
    return pairs(pdf, rows.map(([label, v]) => [label, decimal(v, true)]), y, "right", 140);
}

// ---------------------------------------------------------------------------
// Belge
// ---------------------------------------------------------------------------
/** PDF'i oluşturur ama indirmez (önizleme / test için de kullanılabilir). */
export async function buildDocumentPdf(data: DocumentPdfData): Promise<jsPDF> {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
    await loadFonts(pdf);

    const d = data.document;
    const c = company(d);
    const companyName = value(c.name);
    const docNumber = value(d.documentNumber);

    pdf.setProperties({
        title: `Yatırım Teşvik Belgesi - ${docNumber}`,
        subject: "Bilgi amaçlı belge özeti (resmî belge değildir)",
        creator: "Teşvik Akkaş",
    });

    let y = drawCover(pdf, companyName, docNumber);

    y = section(pdf, "1", "YATIRIM CİNSİ", y);
    y = pairs(pdf, [["Yatırım Cinsi", data.investmentType]], y);

    y = section(pdf, "2", "ÜRÜN BİLGİLERİ", y);
    y = table(pdf, [
        { key: "productName", label: "Ürün Adı", width: 40 },
        { key: "us97Code", label: "US97 Kodu", width: 20, align: "center" },
        { key: "us97Description", label: "US97 Açıklaması", width: 53 },
        { key: "naceCode", label: "NACE Kodu", width: 19, align: "center" },
        { key: "naceDescription", label: "NACE Açıklaması", width: 47 },
        { key: "unit", label: "Birim", width: 20, align: "center" },
        { key: "existingCapacity", label: "Mevcut Kap.", width: 23, align: "right" },
        { key: "additionalCapacity", label: "İlave Kap.", width: 23, align: "right" },
        { key: "totalCapacity", label: "Toplam Kap.", width: 24, align: "right" },
    ], data.products, y);

    y = section(pdf, "3", "DESTEK UNSURLARI", y);
    y = table(pdf, [
        { key: "supportType", label: "Destek Türü", width: 87 },
        { key: "supportRate", label: "Destek Oranı", width: 72, align: "center" },
        { key: "supportDescription", label: "Açıklama" },
    ], data.supports, y);

    const f = data.financialInfo ?? {};
    const r = data.realizationInfo ?? {};
    y = section(pdf, "4", "FİNANSAL BİLGİLER", y);
    const domesticRealized = number(r.domesticRealization);
    const importedRealized = number(r.importedRealization);
    const machineRealized =
        domesticRealized === null && importedRealized === null
            ? null
            : (domesticRealized ?? 0) + (importedRealized ?? 0);
    const financeRows = [
        financeRow("Arazi-Arsa", f.landCost, r.totalLandRealization),
        financeRow("Bina-İnşaat", f.totalBuildingConstructionExpenses, r.totalBuildingRealization),
        financeRow("Makine-Teçhizat", f.totalMachineryExpenses, machineRealized),
        financeRow("Diğer Yatırım Harcamaları", f.otherInvestmentExpenses, r.totalOtherInvestmentRealization),
        financeRow("Toplam Sabit Yatırım", f.totalInvestment, r.totalRealizedAmount),
    ];
    y = table(pdf, [
        { key: "name", label: "Yatırım Kalemi", width: 99 },
        { key: "planned", label: "Öngörülen (TL)", width: 57, align: "right" },
        { key: "realized", label: "Gerçekleşen (TL)", width: 57, align: "right" },
        { key: "remaining", label: "Kalan (TL)", align: "right", negativeRed: true },
    ], financeRows, y, { emphasizeRow: (i) => i === financeRows.length - 1 });

    y = financeDetails("Arazi-Arsa  ·  Öngörülen / Gerçekleşen Detay", pdf, [
        ["Arazi-Arsa Bedeli (Öngörülen)", f.landCost],
        ["Arazi-Arsa Giderleri (Gerçekleşen)", r.landRealization],
        ["Güncellenmiş Toplam (Gerçekleşen)", r.updatedTotalLandRealization],
    ], y);
    y = financeDetails("Bina-İnşaat  ·  Öngörülen / Gerçekleşen Detay", pdf, [
        ["Ana Bina ve Tesisleri (Öngörülen)", f.mainBuilding],
        ["Yardımcı İşletmeler Bina ve Tesisleri (Öngörülen)", f.auxiliaryEnterpriseEquipment],
        ["Yardımcı Tesisler (Öngörülen)", f.auxiliaryFacilities],
        ["Ana Bina ve Tesisleri (Gerçekleşen)", r.mainBuildingRealization],
        ["Yardımcı İşletmeler Bina ve Tesisleri (Gerçekleşen)", r.auxiliaryFacilitiesRealization],
        ["İdare Binaları (Gerçekleşen)", r.administrativeBuildingsRealization],
        ["Yeraltı Ana Galerileri (Gerçekleşen)", r.undergroundGalleriesRealization],
        ["Güncellenmiş Toplam (Gerçekleşen)", r.updatedTotalBuildingRealization],
    ], y);
    y = financeDetails("Makine-Teçhizat  ·  Öngörülen / Gerçekleşen Detay", pdf, [
        ["Yerli (Öngörülen)", f.domesticMachinery],
        ["İthal (Öngörülen)", f.importedMachinery],
        ["Yerli (Gerçekleşen)", r.domesticRealization],
        ["İthal (Gerçekleşen)", r.importedRealization],
    ], y);
    y = financeDetails("Diğer Yatırım Harcamaları  ·  Öngörülen / Gerçekleşen Detay", pdf, [
        ["İthalat ve Gümrükleme (Öngörülen)", f.importCustoms],
        ["Taşıma ve Sigorta (Öngörülen)", f.transportInsurance],
        ["Montaj (Öngörülen)", f.assembly],
        ["Etüt ve Proje (Öngörülen)", f.studyProject],
        ["Diğer Giderler (Öngörülen)", f.otherExpenses],
        ["Genel Giderler (Öngörülen)", f.generalExpenses],
        ["Yardımcı Makine Teçhizat (Gerçekleşen)", r.auxiliaryMachineryRealization],
        ["İthalat ve Gümrükleme (Gerçekleşen)", r.importCustomsRealization],
        ["Taşıma ve Sigorta (Gerçekleşen)", r.transportInsuranceRealization],
        ["Montaj (Gerçekleşen)", r.assemblyRealization],
        ["Etüt ve Proje (Gerçekleşen)", r.studyProjectRealization],
        ["Diğer Giderler (Gerçekleşen)", r.otherExpensesRealization],
        ["Harcama Belgesi (Gerçekleşen)", r.expenseDocumentRealization],
        ["Güncellenmiş Toplam (Gerçekleşen)", r.updatedTotalOtherInvestmentRealization],
    ], y);
    y = financeDetails("Finansman", pdf, [
        ["Özkaynaklar", f.equity],
        ["Yabancı Kaynaklar", f.foreignResources],
        ["Toplam Finansman", f.totalFinancing],
    ], y);
    y = financeDetails("İthal Makine (USD)", pdf, [
        ["Yeni Makine", f.newMachinery],
        ["Kullanılmış Makine", f.usedMachinery],
        ["Toplam İthal Makine", f.importedMachineryUsd],
    ], y);

    y = section(pdf, "5", "YERLİ MAKİNE VE TEÇHİZAT LİSTESİ", y);
    const domestic = data.domesticMachines.map((m) => ({
        ...m,
        unit: shortUnit(m.unit),
        vat: flag(m.vatExemption),
        quantity: decimal(m.quantity),
        unitPriceTl: decimal(m.unitPriceTl, true),
        totalTl: decimal(m.totalTl, true),
        invoiceRealizedQuantity: decimal(m.invoiceRealizedQuantity),
        invoiceRealizedValue: decimal(m.invoiceRealizedValue, true),
    }));
    y = table(pdf, [
        { key: "sequenceNumber", label: "Sıra No", width: 13, align: "center" },
        { key: "externalMachineId", label: "Makine ID", width: 20, align: "center" },
        { key: "gtipCode", label: "GTİP No", width: 24, align: "center" },
        { key: "name", label: "Adı ve Özelliği", width: 64 },
        { key: "vat", label: "KDV İstisnası", width: 17, align: "center" },
        { key: "quantity", label: "Miktarı", width: 16, align: "right" },
        { key: "unit", label: "Birim", width: 17, align: "center" },
        { key: "unitPriceTl", label: "Birim Fiyatı (TL) (KDV Hariç)", width: 30, align: "right" },
        { key: "invoiceRealizedQuantity", label: "Fatura Gerç. Miktar", width: 20, align: "right" },
        { key: "invoiceRealizedValue", label: "Fatura Gerç. Değer", width: 23, align: "right" },
        { key: "totalTl", label: "Toplam Tutarı (TL) (KDV Hariç)", width: 25, align: "right" },
    ], domestic, y);

    y = section(pdf, "6", "İTHAL MAKİNE VE TEÇHİZAT LİSTESİ", y);
    const imported = data.importedMachines.map((m) => ({
        ...m,
        unit: shortUnit(m.unit),
        originUnitPrice:
            m.originCurrencyFobAmount == null || m.originCurrencyFobAmount === ""
                ? "-"
                : `${decimal(m.originCurrencyFobAmount, true)} ${value(m.originCurrencyFob) === "-" ? "" : value(m.originCurrencyFob)}`.trim(),
        totalFobUsd: decimal(m.totalFobUsd, true),
        totalFobTl: decimal(m.totalFobTl, true),
        quantity: decimal(m.quantity),
    }));
    y = table(pdf, [
        { key: "sequenceNumber", label: "Sıra No", width: 13, align: "center" },
        { key: "name", label: "Adı ve Özelliği", width: 61 },
        { key: "usedMachine", label: "Kullanılmış Makine", width: 24, align: "center" },
        { key: "gtipCode", label: "GTİP No", width: 22, align: "center" },
        { key: "customsTaxExemptionDescription", label: "Gümrük Vergisi İstisnası", width: 26, align: "center" },
        { key: "vatExemptionDescription", label: "KDV İstisnası", width: 20, align: "center" },
        { key: "quantity", label: "Miktarı", width: 15, align: "right" },
        { key: "unit", label: "Birim", width: 16, align: "center" },
        { key: "originUnitPrice", label: "Menşei Ülke Döviz Birim Fiyatı (FOB)", width: 32, align: "right" },
        { key: "totalFobUsd", label: "Toplam Tutarı (FOB $)", width: 20, align: "right" },
        { key: "totalFobTl", label: "Toplam Tutarı (FOB TL)", width: 20, align: "right" },
    ], imported, y);

    y = section(pdf, "7", "ÖZEL ŞARTLAR", y);
    table(pdf, [
        { key: "conditionName", label: "Özel Şart", width: 85 },
        { key: "description", label: "Açıklama" },
    ], data.specialConditions, y);

    // Sayfa başlıkları (2. sayfadan itibaren) ve alt bilgiler
    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        if (page > 1) drawRunningHeader(pdf, docNumber, companyName);
        drawFooter(pdf, page, totalPages);
    }
    return pdf;
}

/** Sidebar'daki "PDF Olarak İndir" butonunun çağırdığı fonksiyon. */
export async function generateDocumentPdf(data: DocumentPdfData): Promise<void> {
    const pdf = await buildDocumentPdf(data);
    const docNumber = value(data.document.documentNumber);
    pdf.save(`Tesvik_Belgesi_${docNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}