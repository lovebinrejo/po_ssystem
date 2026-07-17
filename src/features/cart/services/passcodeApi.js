import { post } from "../../../services/axios";
import { isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

// api/pos/index.php's verify_passcode action is another one-off backend
// patch that only ever reached ecuenta9's WAMP copy — confirmed missing
// from ecnta10's own api/pos/index.php (same shape of gap already found for
// UOM and the true-draft endpoint; see [[pos_standalone_no_backend_changes]]
// for why this project doesn't hand-patch every backend). This is why the
// price passcode gate silently never worked on any backend except that one.
//
// takepos/authenticate.php — the actual legacy passcode check this feature
// mirrors (terminal passcode, the assigned admin's own login password, a
// dedicated cash passcode, or permission id 50155) — is genuinely stock
// code, confirmed byte-identical between ecnta10's and ecuenta9's copies, so
// it's tried first: same-origin/session-cookie only, same constraint as
// tableApi.js's fetchLegacyTables (works under any dev:*-proxy mode or
// build:htdocs, not under a genuinely cross-origin connection). Falls back
// to the ad-hoc api/pos/index.php endpoint for the one case it's actually
// deployed on (ecuenta9) under a connection where the same-origin trick
// can't run at all.
const verifyViaLegacy = async (terminal, passcode) => {
    const response = await fetch(buildRequestUrl("/takepos/authenticate.php"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", ...dynamicProxyHeaders() },
        body: new URLSearchParams({ passcode, terminal }),
    });
    const result = (await response.text()).trim();
    if (result !== "authenticated" && result !== "failed") {
        throw new Error(`authenticate.php returned unexpected output (status ${response.status}) — likely no valid session cookie was sent`);
    }
    return { authenticated: result === "authenticated" };
};

export const verifyPricePasscode = async (terminal, passcode) => {
    if (isSameOriginBackend()) {
        try {
            return await verifyViaLegacy(terminal, passcode);
        } catch (err) {
            console.warn("[legacy-passcode] authenticate.php failed, falling back to api/pos/index.php:", err.message);
        }
    }
    return post("/api/pos/index.php?action=verify_passcode", { terminal, passcode });
};
