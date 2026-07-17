import ecuentaLogo from "../../../assets/Ecuenta_logo_png 1.png?inline";

// Single source of truth for the printable receipt layout, mirroring legacy
// takeposnew/receipt.php's actual design (navy-blue headings, dotted
// dividers, styled "PAYMENT DETAILS" box, bold sans-serif type) rather than
// the earlier plain monospace placeholder. Kept separate from ReportsModal
// so any other screen that needs to print a receipt (e.g. a future
// "reprint" action from the POS screen itself) can reuse the exact same
// template.
//
// Company logo: always this app's own bundled Ecuenta asset (a fixed
// platform brand mark on every receipt, deliberate — see git history for
// the earlier per-merchant-logo attempt via api/invoices/details.php,
// dropped because most backends either had no real logo configured or
// pointed at Dolibarr's nophoto.png placeholder/this exact same Ecuenta
// asset uploaded as a stand-in). Bundled via Vite's `?inline` import so it's
// embedded as a base64 data URI directly in the generated HTML string —
// works unmodified whether that string ends up in the on-screen iframe's
// srcDoc or a print popup's document.write(), neither of which reliably
// resolves a root-relative asset URL back to this app's own origin.
// Order Type/Table (order_type/table_label) ARE shown
// when present, but only usePaymentBase.js's finalizePayment sets them —
// captured client-side from tableStore at the moment a sale completes,
// since the backend payment payload never persists either value onto the
// invoice itself. A reprint from Reports has no such state to draw on for a
// historical sale, so those rows just don't appear there.
//
// ZRA SDC fiscal e-invoicing data (Receipt No/Internal Data/Invoice
// Signature/SDC ID/MRC + verify QR code) IS shown when present — but only
// ever comes from the api/invoices/index.php fallback path (see
// receiptApi.js's receiptFromInvoiceDetail), not from the primary
// api/pos/receipt/index.php endpoint, which doesn't return this field at
// all. So on a server where the primary endpoint works (e.g. local WAMP),
// this section won't appear even for an invoice that really was
// ZRA-uploaded — only reachable via the fallback path today.
const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmt = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const infoRow = (label, value) => `
    <div class="info-row"><span class="info-label">${esc(label)}</span><span>${esc(value)}</span></div>
`;

// Blended VAT rate across all lines (matches legacy's receipt.php exactly:
// round(total_tva / total_ht * 100, 2)) — a mixed-rate invoice (e.g. one
// line at 16%, another at 3% exempt-category) has no single "the" rate, so
// this is a weighted average across the whole invoice, not any one line's
// rate. Each line still shows its own real rate individually via the
// vat-tag above.
const vatRatePercent = (receipt) => {
    const ht = Number(receipt.total_ht) || 0;
    const tva = Number(receipt.total_tva) || 0;
    return ht > 0 ? Math.round((tva / ht) * 10000) / 100 : 0;
};

const lineItemHtml = (line, currency) => `
    <div class="item-row">
        <div class="item-name">
            ${esc(line.product_label || line.description)}
            ${line.tva_tx ? `<span class="vat-tag"> (VAT: ${esc(Number(line.tva_tx).toFixed(3))}%)</span>` : ""}
        </div>
        <div class="item-details">
            <span>Qty: ${esc(line.qty)} X ${fmt(line.price_unit)} ${esc(currency)}</span>
            <span class="item-total">${fmt(line.total_ttc)} ${esc(currency)}</span>
        </div>
    </div>
`;

const paymentRowHtml = (payment, currency) => `
    <div class="info-row">
        <span>${esc(payment.payment_label || payment.payment_code)}:</span>
        <span>${fmt(payment.amount)} ${esc(currency)}</span>
    </div>
`;

// Mirrors legacy's receipt.php SDC INFORMATION block. The QR image itself
// is generated from qr_code_url (a ZRA verification link, not an image) via
// a public QR-rendering API — this is exactly legacy's own fallback method
// when its local phpqrcode library isn't available (it tries that first,
// then Google Charts, then this same qrserver.com endpoint) — not a new
// third-party dependency this project introduced.
const sdcInfoRow = (label, value) => (value ? `<div>${esc(label)} : ${esc(value)}</div>` : "");

const zraSdcHtml = (zra) => {
    if (!zra || !zra.receipt_no) return "";
    return `
        <div class="divider"></div>
        <div class="zra-title">SDC INFORMATION</div>
        <div class="zra-info">
            ${sdcInfoRow("Receipt No", zra.receipt_no)}
            ${sdcInfoRow("Internal Data", zra.internal_data)}
            ${sdcInfoRow("Invoice Signature", zra.invoice_signature)}
            ${sdcInfoRow("Invoice No", zra.invoice_no)}
            ${sdcInfoRow("SDC ID", zra.sdc_id)}
            ${sdcInfoRow("MRC", zra.mrc)}
            ${sdcInfoRow("Date", zra.date)}
        </div>
        ${
            zra.qr_code_url
                ? `<div class="zra-qr">
                       <div class="qr-code-label">Scan to Verify Invoice</div>
                       <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(zra.qr_code_url)}" alt="ZRA QR Code" />
                   </div>`
                : ""
        }
        <div class="end-invoice">End of Legal Invoice</div>
    `;
};

const RECEIPT_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-weight: bold; padding: 20px; max-width: 340px; margin: 0 auto; color: #1f2937; line-height: 1.3; }
    .center { text-align: center; }
    .company-logo { max-width: 120px; max-height: 80px; margin: 0 auto 6px; display: block; }
    .company-name { font-size: 14px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-info { font-size: 11px; color: #333; }
    .welcome-text { font-size: 13px; font-weight: bold; text-align: center; color: #1e3a8a; margin: 6px 0; letter-spacing: 1px; }
    .divider { border: none; border-top: 2px dotted #999; margin: 8px 0; height: 2px; }
    .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 1px 0; gap: 12px; }
    .info-label { font-weight: bold; color: #1e3a8a; }
    .item-row { margin: 7px 0; }
    .item-name { font-size: 11px; font-weight: bold; }
    .vat-tag { font-weight: normal; color: #666; font-size: 10px; }
    .item-details { display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px; color: #333; }
    .item-total { font-weight: bold; }
    .total-label { text-align: center; font-weight: bold; font-size: 12px; margin: 6px 0; }
    .grand-total { font-size: 15px; font-weight: bold; border-top: 2px double #333; margin-top: 6px; padding-top: 6px; color: #397db9; }
    .payment-section { background: #f0f9ff; border: 1px solid #23527b; border-radius: 4px; padding: 6px 8px; margin-top: 4px; }
    .payment-title { font-weight: bold; color: #397db9; font-size: 12px; text-align: center; margin-bottom: 4px; }
    .zra-title { font-weight: bold; font-size: 12px; color: #1e3a8a; text-align: center; margin-bottom: 4px; }
    .zra-info { font-size: 10px; color: #333; line-height: 1.4; word-break: break-all; }
    .zra-qr { text-align: center; margin: 10px 0; }
    .zra-qr img { max-width: 140px; height: auto; border: 2px solid #ddd; padding: 4px; background: #fff; }
    .qr-code-label { font-weight: bold; font-size: 11px; margin-bottom: 6px; }
    .end-invoice { text-align: center; font-weight: bold; font-size: 11px; margin: 6px 0; }
    .footer { text-align: center; margin-top: 16px; font-size: 12px; border-top: 1px dotted #999; padding-top: 10px; }
    .footer .thanks { font-weight: bold; margin-bottom: 4px; }
    .footer .callagain { color: #666; font-style: italic; font-size: 13px; }
`;

// thermalWidth mirrors legacy's receipt.php $thermal_width param (58 or
// 80mm, the two common thermal-printer paper widths) — only affects the
// actual print output's page size, same as legacy: the normal on-screen
// view always stays the same comfortable width regardless of which is
// selected, matching legacy's own .receipt-container (fixed 480px) vs
// @media print @page (thermal_width-driven) split.
export const buildReceiptHtml = (receipt, { thermalWidth = 80 } = {}) => {
    const currency = receipt.currency_symbol || receipt.currency || "";
    const company = receipt.company || {};
    const customer = receipt.customer || {};

    return `
        <html>
            <head>
                <title>Invoice ${esc(receipt.invoice_ref)}</title>
                <style>
                    ${RECEIPT_STYLES}
                    @media print {
                        @page { size: ${thermalWidth}mm auto; margin: 0; }
                        body { width: ${thermalWidth}mm; max-width: ${thermalWidth}mm; padding: 3mm; }
                    }
                </style>
            </head>
            <body>
                <div class="center">
                    <img class="company-logo" src="${ecuentaLogo}" alt="${esc(company.name)}" />
                    <div class="company-name">${esc(company.name)}</div>
                    ${company.address ? `<div class="company-info">${esc(company.address)}</div>` : ""}
                    ${company.zip || company.town ? `<div class="company-info">${esc(`${company.zip || ""} ${company.town || ""}`.trim())}</div>` : ""}
                    ${company.phone ? `<div class="company-info">Tel: ${esc(company.phone)}</div>` : ""}
                    ${company.tpin ? `<div class="company-info"><strong>Tpin : ${esc(company.tpin)}</strong></div>` : ""}
                </div>

                <div class="welcome-text">WELCOME</div>
                <div class="divider"></div>

                ${infoRow("Inv No :", receipt.invoice_ref)}
                ${infoRow("Date:", `${receipt.invoice_date} ${receipt.invoice_time || ""}`.trim())}
                ${infoRow("Terminal :", receipt.terminal || "1")}
                ${receipt.sales_associate ? infoRow("Sale By :", receipt.sales_associate) : ""}
                ${receipt.order_type ? infoRow("Order Type :", receipt.order_type === "table" ? "On Table" : "On Pickup") : ""}
                ${receipt.table_label ? infoRow("Table :", receipt.table_label) : ""}

                ${
                    customer.name
                        ? `<div class="divider"></div>
                           ${infoRow("Customer:", customer.name)}
                           ${customer.tpin ? infoRow("Tpin:", customer.tpin) : ""}`
                        : ""
                }

                <div class="divider"></div>

                ${(receipt.lines || []).map((line) => lineItemHtml(line, currency)).join("")}

                <div class="divider"></div>
                <div class="total-label">Total [ ${(receipt.lines || []).length} ]</div>
                <div class="divider"></div>

                ${infoRow("Total (excl. tax)", `${fmt(receipt.total_ht)} ${currency}`)}
                ${infoRow(`VAT ${vatRatePercent(receipt)}%`, `${fmt(receipt.total_tva)} ${currency}`)}
                <div class="info-row grand-total"><span>Total (inc. tax)</span><span>${fmt(receipt.total_ttc)} ${esc(currency)}</span></div>

                ${
                    (receipt.payments || []).length > 0
                        ? `<div class="divider"></div>
                           <div class="payment-section">
                               <div class="payment-title">PAYMENT DETAILS</div>
                               ${receipt.payments.map((p) => paymentRowHtml(p, currency)).join("")}
                               ${receipt.change > 0 ? infoRow("Change:", `${fmt(receipt.change)} ${currency}`) : ""}
                           </div>`
                        : ""
                }

                ${zraSdcHtml(receipt.zra_sdc)}

                <div class="footer">
                    <div class="thanks">Thank you for your business!</div>
                    <div class="callagain">Call again</div>
                </div>
            </body>
        </html>
    `;
};

export const printReceipt = (receipt, { thermalWidth = 80 } = {}) => {
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return false;
    printWindow.document.write(buildReceiptHtml(receipt, { thermalWidth }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return true;
};
