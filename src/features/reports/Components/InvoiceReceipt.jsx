// Single source of truth for the printable receipt layout, mirroring legacy
// takeposnew/receipt.php's structure (company header, WELCOME banner, dashed
// dividers, invoice/customer info, line items with VAT%, totals, payment
// details, thank-you footer). Kept separate from ReportsModal so any other
// screen that needs to print a receipt (e.g. a future "reprint" action from
// the POS screen itself) can reuse the exact same template.
const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmt = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const infoRow = (label, value) => `
    <div class="info-row"><span class="info-label">${esc(label)}</span><span>${esc(value)}</span></div>
`;

const lineItemHtml = (line, currency) => `
    <div class="item-row">
        <div class="item-name">
            ${esc(line.product_label || line.description)}
            ${line.tva_tx ? `<span class="vat-tag"> (VAT: ${esc(line.tva_tx)}%)</span>` : ""}
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

const RECEIPT_STYLES = `
    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #1f2937; }
    .center { text-align: center; }
    .company-name { font-weight: 700; font-size: 14px; margin-top: 6px; }
    .company-info { font-size: 11px; color: #444; }
    .welcome-text { text-align: center; font-weight: 700; margin: 10px 0; letter-spacing: 1px; }
    .divider { border-top: 1px dashed #999; margin: 10px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; gap: 12px; }
    .info-label { color: #444; }
    .item-row { margin: 8px 0; }
    .item-name { font-size: 12px; font-weight: 600; }
    .vat-tag { font-weight: 400; color: #666; font-size: 10px; }
    .item-details { display: flex; justify-content: space-between; font-size: 12px; margin-top: 2px; }
    .item-total { font-weight: 600; }
    .total-label { text-align: center; font-weight: 700; margin: 8px 0; font-size: 12px; }
    .grand-total { font-size: 15px; font-weight: 700; border-top: 2px solid #1f2937; margin-top: 6px; padding-top: 6px; }
    .payment-title { font-weight: 700; margin-bottom: 4px; }
    .footer { text-align: center; margin-top: 16px; font-size: 12px; }
    .footer .thanks { font-weight: 700; }
    .footer .callagain { color: #888; font-style: italic; }
    @media print { body { padding: 0; } }
`;

export const buildReceiptHtml = (receipt) => {
    const currency = receipt.currency_symbol || receipt.currency || "";
    const company = receipt.company || {};
    const customer = receipt.customer || {};

    return `
        <html>
            <head>
                <title>Invoice ${esc(receipt.invoice_ref)}</title>
                <style>${RECEIPT_STYLES}</style>
            </head>
            <body>
                <div class="center">
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
                ${receipt.sales_associate ? infoRow("Sales Associate :", receipt.sales_associate) : ""}

                ${
                    customer.name
                        ? `<div class="divider"></div>
                           ${infoRow("Customer:", customer.name)}
                           ${customer.tpin ? infoRow("Tpin:", customer.tpin) : ""}`
                        : ""
                }

                <div class="divider"></div>

                ${(receipt.lines || []).map((line) => lineItemHtml(line, currency)).join("")}

                <div class="total-label">Total [ ${(receipt.lines || []).length} ]</div>
                <div class="divider"></div>

                ${infoRow("Total (excl. tax)", `${fmt(receipt.total_ht)} ${currency}`)}
                ${infoRow("VAT", `${fmt(receipt.total_tva)} ${currency}`)}
                <div class="info-row grand-total"><span>Total (inc. tax)</span><span>${fmt(receipt.total_ttc)} ${esc(currency)}</span></div>

                ${
                    (receipt.payments || []).length > 0
                        ? `<div class="divider"></div>
                           <div class="payment-title">PAYMENT DETAILS</div>
                           ${receipt.payments.map((p) => paymentRowHtml(p, currency)).join("")}
                           ${receipt.change > 0 ? infoRow("Change:", `${fmt(receipt.change)} ${currency}`) : ""}`
                        : ""
                }

                <div class="divider"></div>
                <div class="footer">
                    <div class="thanks">Thank you for your business!</div>
                    <div class="callagain">Call again</div>
                </div>
            </body>
        </html>
    `;
};

export const printReceipt = (receipt) => {
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return false;
    printWindow.document.write(buildReceiptHtml(receipt));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return true;
};
