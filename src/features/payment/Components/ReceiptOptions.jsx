import { Printer, X, ShoppingCart } from "lucide-react";
import { buildReceiptHtml, printReceipt } from "../../reports/Components/InvoiceReceipt";

function ReceiptOptions({ receipt, onClose, onNewSale }) {
    const html = buildReceiptHtml(receipt);

    return (
        <div>
            <div className="px-6 py-4">
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white">
                    <iframe title="Receipt preview" srcDoc={html} className="w-full h-96" />
                </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-slate-700">
                <button
                    type="button"
                    onClick={() => printReceipt(receipt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291]"
                >
                    <Printer size={16} />
                    Print Receipt
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose || onNewSale}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        <X size={16} />
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onNewSale}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                        <ShoppingCart size={16} />
                        New Transaction
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReceiptOptions;
