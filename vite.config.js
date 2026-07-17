import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import http from 'node:http'
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

// "wamp-proxy" mode: the same trick as "demo-proxy" above, but for a local
// WAMP Dolibarr install (e.g. c:\wamp64\www\ecnta10\htdocs) instead of the
// remote demo server. Confirmed live 2026-07-17 against that exact install:
// api/invoices/index.php (the cross-origin fallback Reports uses when this
// proxy isn't active) has no `author` field at all, and api/pos/receipt/
// index.php's CORS headers never reach the browser on a real cross-origin
// request — that script includes main.inc.php without first defining
// NOLOGIN/NOREQUIREHTML/etc. (unlike its sibling api/invoices/index.php),
// so Dolibarr's bootstrap redirects the credential-less CORS preflight to
// the login page before the script's own header() calls ever run. Proxying
// through Node sidesteps both: same-origin session cookies unlock the real
// reports_data.php/payment_summary.php (with real author/payment_type), and
// the receipt endpoint is never hit cross-origin in the first place. A
// backend-side fix would be more correct (see [[pos_standalone_no_backend_changes]]
// for why that's not done here), but this WAMP path is plain HTTP and
// local, so no keep-alive agent is needed the way demo-proxy's HTTPS one is.
const WAMP_PROXY_TARGET = 'http://localhost/ecnta10/htdocs'

// "proxy" mode: generalizes demo-proxy/wamp-proxy above into one mode that
// works with ANY backend, chosen at runtime from the login screen's Backend
// URL field, instead of a hardcoded target baked into this file per backend.
// Vite's built-in server.proxy only accepts a static target (or a `router`
// keyed by hostname/path — not by an arbitrary request header), so this is a
// small hand-rolled middleware instead: the frontend (see apiConfig.js's
// isDynamicProxyMode/axios.js) sends every /api, /takeposnew, and /takepos
// request as a same-origin relative path carrying the real target in an X-Pos-Target
// header, and this reads that header per-request to decide where to
// forward — the same same-origin-cookie trick as demo-proxy/wamp-proxy,
// just resolved dynamically instead of fixed at config time. Also means
// this app's own X-API-Key endpoints never see a genuine cross-origin
// request either, which incidentally sidesteps wamp-proxy's documented
// api/pos/receipt/index.php CORS bug too (no CORS-subject browser request
// is ever made against that file in the first place — see
// [[legacy_dolibarr_pos_backend]] for why that endpoint's own preflight
// handling is broken).
//
// One shared keep-alive agent per protocol (not one per target): Node's
// http.Agent/https.Agent already pool connections per-host internally, so a
// single instance serving multiple different backends still gets the same
// warm-connection benefit demoProxyAgent above was added for, without
// needing to create a new agent per backend URL ever typed in.
const dynamicProxyAgents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: 10 }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: 10 }),
}

const dynamicBackendProxyPlugin = () => ({
  name: 'dynamic-backend-proxy',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url.startsWith('/api') && !req.url.startsWith('/takeposnew') && !req.url.startsWith('/takepos')) {
        next()
        return
      }
      const target = req.headers['x-pos-target']
      if (!target) {
        res.statusCode = 400
        res.end(JSON.stringify({ success: false, error: 'Missing X-Pos-Target header — no backend configured for this dev session yet.' }))
        return
      }

      let targetUrl
      try {
        targetUrl = new URL(target + req.url)
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ success: false, error: `Invalid X-Pos-Target header: "${target}"` }))
        return
      }

      const mod = targetUrl.protocol === 'https:' ? https : http
      const agent = dynamicProxyAgents[targetUrl.protocol]

      // Host must match the real target (not localhost:PORT, which is what
      // the browser sent) or Apache/Dolibarr routes the request to whatever
      // vhost happens to own that Host header instead of the intended one —
      // same reasoning as changeOrigin: true on the static proxy configs
      // above.
      const forwardedHeaders = { ...req.headers, host: targetUrl.host }
      delete forwardedHeaders['x-pos-target']

      const proxyReq = mod.request(
        {
          protocol: targetUrl.protocol,
          hostname: targetUrl.hostname,
          port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers: forwardedHeaders,
          agent,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers)
          proxyRes.pipe(res)
        }
      )
      proxyReq.on('error', (err) => {
        res.statusCode = 502
        res.end(JSON.stringify({ success: false, error: `Dynamic proxy could not reach ${target}: ${err.message}` }))
      })
      req.pipe(proxyReq)
    })
  },
})

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
      ...(mode === 'proxy' ? [dynamicBackendProxyPlugin()] : []),
    ],
    server: {
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      ...(mode === 'demo-proxy' ? {
        proxy: {
          '/api': { target: DEMO_PROXY_TARGET, changeOrigin: true, secure: true, agent: demoProxyAgent },
          '/takeposnew': { target: DEMO_PROXY_TARGET, changeOrigin: true, secure: true, agent: demoProxyAgent },
          '/takepos': { target: DEMO_PROXY_TARGET, changeOrigin: true, secure: true, agent: demoProxyAgent },
        },
      } : {}),
      ...(mode === 'wamp-proxy' ? {
        proxy: {
          '/api': { target: WAMP_PROXY_TARGET, changeOrigin: true },
          '/takeposnew': { target: WAMP_PROXY_TARGET, changeOrigin: true },
          '/takepos': { target: WAMP_PROXY_TARGET, changeOrigin: true },
        },
      } : {}),
    },
  }
})
