import ExcelJS from "exceljs";
import companyLogoUrl from "../../../assets/Ecuenta_logo_png.png";

// Single source of truth for the two report export formats (Excel/.xlsx and
// PDF/print), kept separate from ReportsModal so the export layout can be
// maintained independently — mirrors how InvoiceReceipt.jsx owns the receipt
// template.
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => Number(n ?? 0).toFixed(2);

const ENTRY_HEADERS = [
    "Date", "Invoice No", "Third Party", "Amt (Excl)", "VAT",
    "Amt (Incl)", "Pending", "Received", "Currency", "Status",
];

const entryToRow = (e) => [
    e.date, e.ref, e.customer, Number(e.total_ht), Number(e.total_tva),
    Number(e.total_ttc), Number(e.pending), Number(e.received), e.currency, e.status,
];

const exportFilename = (start, end, ext) => `pos-report-${start}_to_${end}.${ext}`;
const COMPANY_NAME = "ECUENTA";
const HEADER_FILL = "FF2C6291"; // app's navbar blue, ARGB

// ── Excel (.xlsx via ExcelJS) ────────────────────────────────────────────────
// Real spreadsheet output (not CSV) so the header row can be colored and the
// company logo can be embedded — plain CSV can't carry either.
const styleHeaderRow = (row) => {
    row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle" };
    });
};

const buildReportWorkbook = async ({ entries, totals, startIso, endIso, terminal, searchTerm }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = COMPANY_NAME;
    const sheet = workbook.addWorksheet("POS Report");

    // Logo (top-left), with room reserved via blank header rows.
    try {
        const logoResponse = await fetch(companyLogoUrl);
        const logoBuffer = await logoResponse.arrayBuffer();
        const imageId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
        sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 50 } });
    } catch {
        // Logo is a nice-to-have — if the asset fails to load, the report still exports fine without it.
    }

    sheet.getRow(1).height = 40;
    sheet.mergeCells("C1:F1");
    sheet.getCell("C1").value = COMPANY_NAME;
    sheet.getCell("C1").font = { size: 16, bold: true, color: { argb: HEADER_FILL } };
    sheet.mergeCells("C2:F2");
    sheet.getCell("C2").value = "POS Sales Report";
    sheet.getCell("C2").font = { size: 11, color: { argb: "FF6B7280" } };
    sheet.addRow([]);

    // Filter context (date range, terminal, search) + when this file was generated —
    // without this, a downloaded report carries no record of what it was filtered by.
    const greyItalic = { italic: true, color: { argb: "FF6B7280" } };
    sheet.addRow([`Date Filter: ${startIso} to ${endIso}`]).font = greyItalic;
    sheet.addRow([`Terminal: ${terminal ?? "-"}`]).font = greyItalic;
    if (searchTerm) sheet.addRow([`Search Filter: "${searchTerm}"`]).font = greyItalic;
    sheet.addRow([`Exported: ${new Date().toLocaleString()}`]).font = greyItalic;
    sheet.addRow([]);

    sheet.addRow(["Invoices"]).font = { bold: true, size: 12 };
    styleHeaderRow(sheet.addRow(ENTRY_HEADERS));
    entries.forEach((e) => sheet.addRow(entryToRow(e)));
    if (totals) {
        const grandTotalRow = sheet.addRow([
            "", "", "Total", Number(totals.total_ht), Number(totals.total_tva),
            Number(totals.total_ttc), Number(totals.pending), Number(totals.received), "", "",
        ]);
        grandTotalRow.font = { bold: true };
    }

    sheet.columns.forEach((col, i) => {
        col.width = i === 1 || i === 2 ? 16 : 13;
    });

    return workbook;
};

export const exportReportExcel = async ({ entries, totals, startIso, endIso, terminal, searchTerm }) => {
    const workbook = await buildReportWorkbook({ entries, totals, startIso, endIso, terminal, searchTerm });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFilename(startIso, endIso, "xlsx");
    link.click();
    URL.revokeObjectURL(url);
};

// ── PDF (print) ──────────────────────────────────────────────────────────────
const PDF_STYLES = `
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; }
    .header { background: #2c6291; color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header .period { font-size: 12px; opacity: 0.85; margin-top: 2px; }
    h2 { font-size: 13px; margin: 18px 0 8px; }
    .totals-strip { display: flex; gap: 16px; text-align: center; margin: 14px 0; }
    .totals-strip div { flex: 1; }
    .totals-strip .label { font-size: 10px; color: #6b7280; }
    .totals-strip .value { font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
    th, td { border: 1px solid #e5e7eb; padding: 5px 7px; }
    th { background: #f3f4f6; text-align: left; text-transform: uppercase; font-size: 9px; color: #6b7280; }
    td.num { text-align: right; }
    tfoot td { font-weight: 700; background: #f9fafb; }
    .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

export const buildReportPdfHtml = ({ entries, totals, startIso, endIso, terminal, searchTerm }) => {
    const rowsHtml = entries
        .map(
            (e) => `<tr>
                <td>${esc(e.date)}</td><td>${esc(e.ref)}</td><td>${esc(e.customer)}</td>
                <td class="num">${fmt(e.total_ht)}</td><td class="num">${fmt(e.total_tva)}</td>
                <td class="num">${fmt(e.total_ttc)}</td><td class="num">${fmt(e.pending)}</td>
                <td class="num">${fmt(e.received)}</td>
                <td>${esc(e.currency)}</td><td>${esc(e.status)}</td>
            </tr>`
        )
        .join("");

    return `
        <html>
            <head>
                <title>POS Report ${startIso} to ${endIso}</title>
                <style>${PDF_STYLES}</style>
            </head>
            <body>
                <div class="header">
                    <h1>POS Sales Report</h1>
                    <div class="period">
                        Date Filter: ${startIso} to ${endIso} &bull; Terminal: ${esc(terminal ?? "-")}
                        ${searchTerm ? ` &bull; Search: "${esc(searchTerm)}"` : ""}
                    </div>
                </div>

                ${
                    totals
                        ? `<div class="totals-strip">
                            <div><div class="label">Total Invoices</div><div class="value">${entries.length}</div></div>
                            <div><div class="label">Total Amount</div><div class="value">ZMW ${fmt(totals.total_ttc)}</div></div>
                            <div><div class="label">Received</div><div class="value">ZMW ${fmt(totals.received)}</div></div>
                            <div><div class="label">Pending</div><div class="value">ZMW ${fmt(totals.pending)}</div></div>
                           </div>`
                        : ""
                }

                <h2>Invoices</h2>
                <table>
                    <thead>
                        <tr>${ENTRY_HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr>
                    </thead>
                    <tbody>${rowsHtml || `<tr><td colspan="10" style="text-align:center;color:#9ca3af;">No entries</td></tr>`}</tbody>
                    ${
                        totals
                            ? `<tfoot><tr>
                                <td colspan="3">Total</td>
                                <td class="num">${fmt(totals.total_ht)}</td>
                                <td class="num">${fmt(totals.total_tva)}</td>
                                <td class="num">${fmt(totals.total_ttc)}</td>
                                <td class="num">${fmt(totals.pending)}</td>
                                <td class="num">${fmt(totals.received)}</td>
                                <td colspan="2"></td>
                               </tr></tfoot>`
                            : ""
                    }
                </table>

                <div class="footer">Generated ${new Date().toLocaleString()}</div>
            </body>
        </html>
    `;
};

export const exportReportPDF = ({ entries, totals, startIso, endIso, terminal, searchTerm }) => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return false;
    printWindow.document.write(buildReportPdfHtml({ entries, totals, startIso, endIso, terminal, searchTerm }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return true;
};
