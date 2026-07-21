import { post } from "../../../services/axios";
import { isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

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
