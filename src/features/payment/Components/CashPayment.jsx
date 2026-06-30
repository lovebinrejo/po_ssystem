import { useState } from "react";
import ChangeCalculator from "./ChangeCalculator";

// Mirrors legacy's calculateChange(), which is bound to the amount input's
// 'input' event — it only ever runs in response to the cashier actually
// typing, never on the field's pre-filled default value (setting .value
// programmatically doesn't fire 'input'). hasEdited tracks that same
// distinction here, so the banner stays hidden until there's a real edit.
function CashPayment({ total, amountTendered, setAmountTendered }) {
    const [hasEdited, setHasEdited] = useState(false);

    return (
        <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300 mt-5 mb-2">Payment Details:</h3>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
                    <span className="font-semibold">ZMW {total.toFixed(2)}</span>
                </div>
                <div>
                    <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Amount Tendered:</label>
                    <input
                        type="number"
                        value={amountTendered}
                        onChange={(e) => {
                            setHasEdited(true);
                            setAmountTendered(e.target.value);
                        }}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                </div>
                {hasEdited && <ChangeCalculator total={total} tendered={amountTendered} />}
            </div>
        </div>
    );
}

export default CashPayment;
