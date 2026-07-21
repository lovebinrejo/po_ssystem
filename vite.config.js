import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
// "htdocs"/"htdocs-ecnta10" modes build for same-origin deployment inside a
// local WAMP Dolibarr docroot (htdocs/pos-app/), one per WAMP instance so
// both stay independently buildable. See .env.htdocs(-ecnta10) and
// AppRoutes.jsx's basename={import.meta.env.BASE_URL}.
const DEMO_PROXY_TARGET = 'https://demo.ecuenta.online' // demo1.ecuenta.online resolves to the same backend

// "demo-proxy" mode: dev-only. Proxying through this Node server (not a
// browser) sidesteps demo.ecuenta.online's CORS/session-cookie SameSite
// restrictions entirely — every request looks same-origin to the browser,
// so the DOLSESSID cookie and legacy session-only endpoints just work.
// See .env.demo-proxy (VITE_API_BASE_URL='' makes requests same-origin).

// Shared keep-alive agent: without it, each proxied request pays for a full
// TCP+TLS handshake to demo.ecuenta.online instead of reusing a connection —
// measured 7-20s+ per request vs ~0.4-0.8s direct.
const demoProxyAgent = new https.Agent({ keepAlive: true, maxSockets: 10 })

// "wamp-proxy" mode: same trick as demo-proxy, for a local WAMP Dolibarr
// install — also sidesteps that backend's own CORS/session-cookie gaps
// (see [[legacy_dolibarr_pos_backend]]). Plain HTTP/local, so no keep-alive
// agent needed.
const WAMP_PROXY_TARGET = 'http://localhost/ecnta10/htdocs'

// "proxy" mode: generalizes demo-proxy/wamp-proxy to work with ANY backend
// chosen at runtime from the login screen, instead of one hardcoded target
// per mode. Vite's built-in server.proxy only takes a static target, so this
// is a small hand-rolled middleware: the frontend sends every /api,
// /takeposnew, /takepos request as a same-origin path carrying the real
// target in an X-Pos-Target header, and this forwards accordingly.

// One shared keep-alive agent per protocol — Node's Agent already pools
// connections per-host, so this covers every backend URL typed in without
// needing a new agent per target.
const dynamicProxyAgents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: 10 }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: 10 }),
}

// public/.htaccess hardcodes its SPA-fallback RewriteBase/RewriteRule to
// /ecuenta9/htdocs/pos-app/ (Vite copies publicDir files verbatim, no
// per-mode templating) — this patches the copied .htaccess after build so
// any htdocs-style mode gets the correct base instead of breaking
// client-side route refreshes.
const rewriteHtaccessBasePlugin = (base) => ({
  name: 'rewrite-htaccess-base',
  closeBundle() {
    const outFile = path.resolve(process.cwd(), 'dist/.htaccess')
    if (!fs.existsSync(outFile)) return
    const patched = fs.readFileSync(outFile, 'utf-8').replaceAll('/ecuenta9/htdocs/pos-app/', base)
    fs.writeFileSync(outFile, patched)
  },
})

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

      // Host must match the real target, not localhost:PORT, or
      // Apache/Dolibarr routes to whichever vhost owns that Host header.
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
  // strictPort turns a port collision into a loud startup error instead of
  // Vite silently picking the next free port (which desynced from the
  // Backend URL override saved in localStorage under the original port).
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'htdocs' ? '/ecuenta9/htdocs/pos-app/' : mode === 'htdocs-ecnta10' ? '/ecnta10/htdocs/pos-app/' : '/'
  return {
    base,
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      ...(mode === 'proxy' ? [dynamicBackendProxyPlugin()] : []),
      ...((mode === 'htdocs' || mode === 'htdocs-ecnta10') ? [rewriteHtaccessBasePlugin(base)] : []),
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
