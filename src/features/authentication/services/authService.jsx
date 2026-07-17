import { getApiBaseUrl, isSameOriginBackend, buildRequestUrl, dynamicProxyHeaders } from "../../../services/apiConfig";

// Same-origin only: piggybacks a real Dolibarr session cookie (DOLSESSID) by
// POSTing straight to takeposnew's own login entry point, using the exact
// field names main.inc.php's core login check expects (username, password,
// actionlogin=login) — the same request a real Dolibarr login form makes.
// Only meaningful when this build is served from the same origin as the
// backend (the "htdocs" build, see vite.config.js): cross-origin, Dolibarr's
// CSRF referer check correctly rejects it, same as any other cross-site
// caller — verified live. Best-effort: a failure here doesn't fail login,
// since api/login/index.php below remains the actual source of truth for
// whether pos_standalone considers the user logged in. This just means
// session-only legacy endpoints won't be reachable until it succeeds.
//
// Also passes `setterminal` — takeposnew/index.php's own terminal-detection
// (`$_SESSION["takeposterminal"]`) only auto-picks a value when there's a
// single configured terminal or a stale `takeposterminal` cookie from a
// previous legacy-UI visit; without this it can stay unset for a
// multi-terminal shop, which would silently default session-scoped legacy
// endpoints (e.g. reports_data.php) to terminal 1 regardless of which
// terminal this login actually resolved to. Passing it makes the legacy
// session agree with `terminalConfig.terminalNumber` below.
//
// A successful login POST here returns the actual TakePOS page HTML, which
// embeds `window.ECUENTA_POS.passcodeEnabled` — server-rendered straight
// from the same TAKEPOS_ENABLE_PASSCODE{n} Dolibarr constant api/login's own
// terminal_config.passcode_enabled is supposed to reflect. That field is
// another one-off backend patch that only ever reached ecuenta9's api/login
// (confirmed missing from ecnta10's getTerminalConfig() entirely — see
// [[pos_standalone_no_backend_changes]]), so the price-passcode gate looked
// permanently off everywhere else even after verify_passcode itself got
// fixed the same way. This page markup is stock/shared (confirmed identical
// on both WAMP instances), so parsing it out here — a response this call
// already fetches for the session cookie alone — covers every backend
// without a second request or another ad-hoc field to depend on.
const PASSCODE_ENABLED_RE = /passcodeEnabled:\s*(true|false)/;

const establishLegacySession = async ({ email, password, masterEntity, terminalNumber }) => {
  try {
    const response = await fetch(buildRequestUrl("/takeposnew/index.php"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...dynamicProxyHeaders() },
      credentials: "same-origin",
      body: new URLSearchParams({
        username: email,
        password,
        actionlogin: "login",
        entity: masterEntity || "1",
        setterminal: String(terminalNumber || 1),
      }),
    });
    // Best-effort by design (see comment above) — this still isn't fatal to
    // login either way — but silently swallowing every outcome made a real
    // failure here indistinguishable from success, which is exactly what
    // made the "Author missing in Reports" investigation so hard to pin
    // down: reports_data.php/payment_summary.php depend on this succeeding,
    // with nothing telling you it didn't. A console line costs nothing and
    // turns that silent failure into something greppable.
    console.info(`[legacy-session] establishLegacySession POST ${response.status} ${response.url}`);
    const html = await response.text();
    const match = html.match(PASSCODE_ENABLED_RE);
    return match ? match[1] === "true" : null;
  } catch (err) {
    console.warn("[legacy-session] establishLegacySession failed (non-fatal to login):", err.message);
    return null;
  }
};

export const loginUser = async ({ email, password, masterEntity }) => {
  const body = new URLSearchParams({
    login: email,
    password,
    entity: masterEntity || "1",
  });

  const response = await fetch(buildRequestUrl("/api/login/index.php"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...dynamicProxyHeaders() },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const message = data?.message || "Invalid username or password";
    const error = new Error(message);
    error.response = { data: { message } };
    throw error;
  }

  const result = data.success;

  let legacyPasscodeEnabled = null;
  if (isSameOriginBackend()) {
    legacyPasscodeEnabled = await establishLegacySession({ email, password, masterEntity, terminalNumber: result.terminal_number });
  } else {
    console.info(`[legacy-session] skipped — isSameOriginBackend() is false (getApiBaseUrl="${getApiBaseUrl()}", page origin="${window.location.origin}")`);
  }

  return {
    success: true,
    token: result.bearer_token,
    apiKey: result.api_key,
    user: {
      id: result.user_id,
      login: result.login,
      fullname: result.fullname,
      email: result.email,
      admin: result.admin,
      entity: result.entity,
    },
    terminalConfig: {
      terminalNumber: result.terminal_number,
      defaultCustomerId: result.default_customer_id,
      ...result.terminal_config,
      // Wins over terminal_config.passcode_enabled above when available —
      // both reflect the same backend constant, but this source works on
      // every backend instead of just the one that got the ad-hoc patch.
      ...(legacyPasscodeEnabled !== null ? { passcode_enabled: legacyPasscodeEnabled } : {}),
    },
  };
};
