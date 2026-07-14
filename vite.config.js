import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import https from 'node:https'

// https://vite.dev/config/
// "htdocs" mode builds for same-origin deployment inside the local WAMP
// Dolibarr docroot, served at /ecuenta9/htdocs/pos-app/ (that prefix is
// WAMP's folder nesting, not present on demo1's docroot — a "htdocs-demo1"
// mode with base "/pos-app/" would be needed if this is later extended
// there). See .env.htdocs and AppRoutes.jsx's basename={import.meta.env.BASE_URL},
// which Vite sets from this automatically.
// "demo-proxy" mode: dev-only, avoids the demo/demo1.ecuenta.online CORS +
// session-cookie SameSite problem entirely, without touching that backend
// at all. The Vite dev server is a Node process, not a browser — CORS is a
// browser-enforced rule, so a request the *dev server* forwards to
// demo.ecuenta.online isn't subject to it. The browser only ever talks to
// localhost (same-origin, always), and since it believes every response
// came from localhost, any Set-Cookie it receives (the DOLSESSID session
// cookie) gets stored for that origin too — so session establishment
// (authService.jsx's establishLegacySession) and the session-only legacy
// endpoints (reports_data.php/payment_summary.php, see reportsApi.js) work
// automatically, no SameSite=None or CORS header changes needed anywhere.
// See .env.demo-proxy — VITE_API_BASE_URL='' there makes every request a
// same-origin relative path (e.g. "/api/login/index.php"), which is what
// lets the rules below intercept it.
const DEMO_PROXY_TARGET = 'https://demo.ecuenta.online' // confirmed live: demo1.ecuenta.online resolves to the same backend

// Without an explicit keep-alive agent, Node opens a brand new TCP+TLS
// connection to demo.ecuenta.online for every single proxied request
// instead of reusing one — each request pays for a full HTTPS handshake
// from scratch. Confirmed live: direct requests to demo.ecuenta.online
// consistently took ~0.4-0.8s, while the same requests through the proxy
// took 7-20+ seconds and the third request in a row (reports_data.php)
// timed out outright — the proxy, not the remote server, was the
// bottleneck. A shared keep-alive agent fixes this by reusing the same
// warm connection across requests.
const demoProxyAgent = new https.Agent({ keepAlive: true, maxSockets: 10 })

export default defineConfig(({ mode }) => {
  // VITE_PORT was already defined in every .env* file but never actually
  // read here — Vite fell back to its own default (5173) and silently
  // incremented to the next free port on any collision, so which port a
  // given mode landed on was unpredictable (and worse, silently wrong: a
  // stale leftover process holding 5173 would push a fresh `demo-proxy`
  // run to some other port, but the browser tab / localStorage-based
  // Backend URL override from an earlier session stays behind on the old
  // port, causing exactly the "why isn't this working" confusion that
  // happened here). strictPort makes a collision a loud startup error
  // instead — telling you to close the other process — rather than a
  // silent, easy-to-miss port change.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: mode === 'htdocs' ? '/ecuenta9/htdocs/pos-app/' : '/',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      ...(mode === 'demo-proxy' ? {
        proxy: {
          '/api': { target: DEMO_PROXY_TARGET, changeOrigin: true, secure: true, agent: demoProxyAgent },
          '/takeposnew': { target: DEMO_PROXY_TARGET, changeOrigin: true, secure: true, agent: demoProxyAgent },
        },
      } : {}),
    },
  }
})
