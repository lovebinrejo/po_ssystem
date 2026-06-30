import { Printer, ShoppingCart } from "lucide-react";
import { buildReceiptHtml, printReceipt } from "../../reports/Components/InvoiceReceipt";

// Shown once a payment has been completed. Reuses the exact same receipt
// template ReportsModal's reprint action uses (buildReceiptHtml/printReceipt
// in reports/Components/InvoiceReceipt.jsx) so the preview here is pixel for
// pixel what actually gets printed — one template, no duplicated markup.
function ReceiptOptions({ receipt, onNewSale }) {
    const html = buildReceiptHtml(receipt);

    return (
        <div className="px-6 py-5 space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Payment Successful</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Invoice {receipt.invoice_ref}</p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white">
                <iframe title="Receipt preview" srcDoc={html} className="w-full h-80" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onNewSale}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                    <ShoppingCart size={16} />
                    New Sale
                </button>
                <button
                    type="button"
                    onClick={() => printReceipt(receipt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-400 shadow-md shadow-green-500/30 hover:from-green-400 hover:to-emerald-300"
                >
                    <Printer size={16} />
                    Print Receipt
                </button>
            </div>
        </div>
    );
}

export default ReceiptOptions;
