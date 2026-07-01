import PaymentDetailsPanel from "./PaymentDetailsPanel";
import TenderedAmountInput from "./TenderedAmountInput";

function MobilePayment({ total, amountTendered, setAmountTendered }) {
    return (
        <PaymentDetailsPanel total={total}>
            {/* {provider && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                    Provider: {provider}
                </div>
            )} */}
            <TenderedAmountInput total={total} amountTendered={amountTendered} setAmountTendered={setAmountTendered} />
        </PaymentDetailsPanel>
    );
}

export default MobilePayment;
