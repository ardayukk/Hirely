# Hirely Frontend (Vite + React)

## Local Development
```
cd frontend
npm install
npm run dev
```
Requests to `/api/*` proxy to `http://localhost:8000` (FastAPI) via `vite.config.js`.

## Structure Overview
```
frontend/
	index.html            # Vite HTML entry
	vite.config.js        # Dev server + API proxy
	src/
		main.jsx            # Single React entry (providers + theme mode)
		ui/
			App.jsx           # Root app component
			ThemeModeContext.js
			theme.js          # MUI theme using semantic palette
			index.css         # CSS variables, dark mode overrides, utilities
			main.jsx          # (stub) legacy duplicate entry kept temporarily
			index.js          # (stub) CRA-style legacy entry kept temporarily
		helper/colors.js    # Semantic JS color tokens
		pages/              # Route-level pages
		components/         # Reusable components
		context/            # Global contexts (Auth, Mock API)
		utils/api.js        # Fetch wrapper
```

## Theming
- Semantic palette in `helper/colors.js` (primary/accent/success/warning/error etc.).
- CSS custom properties in `ui/index.css` for light/dark and spacing/shadows.
- MUI theme (`ui/theme.js`) consumes same palette for consistent look.
- Dark mode toggle stored in `localStorage` (`themeMode`).

## Color Tokens (Light)
Primary `#3D7D6E` · Accent `#FFB347` · Success `#2EAF74` · Warning `#E2A400` · Error `#D9534F` · Background `#F5F9F8`.

## Entry Point Simplification
`src/main.jsx` is now the only runtime entry. Stubs (`ui/index.js`, `ui/main.jsx`) remain only to avoid breaking any unnoticed imports; safely remove after a search confirms no external references.

## Dark Mode
`ThemeModeContext` provides `{ mode, toggleMode }`. MUI palette + CSS variables switch automatically. Add `[data-theme]` attribute handling if pure CSS dark adjustments beyond MUI are needed.

## Next Improvement Ideas
1. Remove legacy stubs after confirming unused.
2. Introduce layout components (e.g. `Layout.jsx`) separating navigation from `App.jsx`.
3. Add Storybook for isolated design review.
4. Integrate ESLint + Prettier configs for consistent formatting.
5. Add accessibility testing (axe / jest-axe) and color contrast verification.

## API Wrapper
`src/utils/api.js` contains a minimal fetch helper—extend for auth headers & error normalization.

