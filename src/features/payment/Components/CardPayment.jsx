import PaymentDetailsPanel from "./PaymentDetailsPanel";
import TenderedAmountInput from "./TenderedAmountInput";

function CardPayment({ total, amountTendered, setAmountTendered }) {
    return (
        <PaymentDetailsPanel total={total}>
            <TenderedAmountInput total={total} amountTendered={amountTendered} setAmountTendered={setAmountTendered} />
        </PaymentDetailsPanel>
    );
}

export default CardPayment;
