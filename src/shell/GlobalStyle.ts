import { createGlobalStyle } from 'styled-components'

/**
 * Design tokens as CSS variables, plus the page reset. Render once at the app root: the table's
 * styled components read `var(--…)` so a host app can re-theme them by redefining the tokens.
 */
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #0a0c0b;
    --panel: #131716;
    --panel-2: #1a201e;
    --border: #232a27;
    --text: #e6ece8;
    --muted: #8a958f;
    --accent: #3ddc84;
    --accent-ink: #04130a;
    --danger: #ff6b6b;
    --warning: #f5b84a;
  }

  * { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
    color-scheme: dark;
  }
`
