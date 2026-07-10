import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// "htdocs" mode builds for same-origin deployment inside the local WAMP
// Dolibarr docroot, served at /ecuenta9/htdocs/pos-app/ (that prefix is
// WAMP's folder nesting, not present on demo1's docroot — a "htdocs-demo1"
// mode with base "/pos-app/" would be needed if this is later extended
// there). See .env.htdocs and AppRoutes.jsx's basename={import.meta.env.BASE_URL},
// which Vite sets from this automatically.
export default defineConfig(({ mode }) => ({
  base: mode === 'htdocs' ? '/ecuenta9/htdocs/pos-app/' : '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
}))
