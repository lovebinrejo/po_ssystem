import { get } from "../../../services/axios";

const ENDPOINT = "/api/pos/reports/index.php";

// Mirrors legacy's loadPaymentSummary() (pos-reports.js), which calls
// payment_summary.php with no date params at all — Payment Summary always
// reflects the current month regardless of the date filter applied below.
export const getPaymentSummary = ({ terminal }) =>
    get(`${ENDPOINT}?${new URLSearchParams({ action: "paymentSummary", terminal })}`);

export const getReportsData = ({ terminal, startDate, endDate, search = "" }) =>
    get(`${ENDPOINT}?${new URLSearchParams({ action: "reportsData", terminal, start_date: startDate, end_date: endDate, search })}`);
