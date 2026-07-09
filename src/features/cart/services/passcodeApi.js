import { post } from "../../../services/axios";

// Mirrors legacy's takepos/authenticate.php passcode check (terminal passcode,
// the assigned admin's own login password, or a dedicated cash passcode,
// falling back to permission id 50155), exposed here over
// api/pos/index.php?action=verify_passcode since that endpoint is X-API-Key
// auth — pos_standalone has no Dolibarr session cookie to call
// authenticate.php with directly.
export const verifyPricePasscode = (terminal, passcode) =>
    post("/api/pos/index.php?action=verify_passcode", { terminal, passcode });
