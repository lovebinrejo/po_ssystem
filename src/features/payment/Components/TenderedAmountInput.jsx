import { useState } from "react";
import ChangeCalculator from "./ChangeCalculator";


function TenderedAmountInput({ total, amountTendered, setAmountTendered }) {
    const [hasEdited, setHasEdited] = useState(false);

    return (
        <>
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
        </>
    );
}

export default TenderedAmountInput;
