import { getApiBaseUrl, isSameOriginBackend } from "../../../services/apiConfig";

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
const establishLegacySession = async ({ email, password, masterEntity, terminalNumber }) => {
  try {
    await fetch(`${getApiBaseUrl()}/takeposnew/index.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "same-origin",
      body: new URLSearchParams({
        username: email,
        password,
        actionlogin: "login",
        entity: masterEntity || "1",
        setterminal: String(terminalNumber || 1),
      }),
    });
  } catch {
    // Non-fatal, see comment above.
  }
};

export const loginUser = async ({ email, password, masterEntity }) => {
  const body = new URLSearchParams({
    login: email,
    password,
    entity: masterEntity || "1",
  });

  const response = await fetch(`${getApiBaseUrl()}/api/login/index.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

  if (isSameOriginBackend()) {
    await establishLegacySession({ email, password, masterEntity, terminalNumber: result.terminal_number });
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
    },
  };
};
