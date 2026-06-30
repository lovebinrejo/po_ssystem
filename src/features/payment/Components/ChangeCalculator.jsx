// Mirrors legacy's calculateChange(): compares tendered vs total and shows a
// green "Change" banner (overpaid) or red "Balance Payable" banner
// (underpaid). Renders nothing on an exact match, same as legacy.
function ChangeCalculator({ total, tendered }) {
    const diff = (parseFloat(tendered) || 0) - total;

    if (Math.abs(diff) < 0.005) return null;

    if (diff > 0) {
        return (
            <div className="flex justify-between items-center bg-emerald-500 text-white rounded-lg px-3 py-2.5">
                <span>Change:</span>
                <span className="text-lg font-bold">ZMW {diff.toFixed(2)}</span>
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center bg-red-500 text-white rounded-lg px-3 py-2.5">
            <span>Balance Payable:</span>
            <span className="text-lg font-bold">ZMW {Math.abs(diff).toFixed(2)}</span>
        </div>
    );
}

export default ChangeCalculator;
