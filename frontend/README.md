# Hirely Frontend (Vite + React)

Local development:

```
cd frontend
npm install
npm run dev
```

During dev, calls to paths starting with `/api` are proxied to `http://localhost:8000` (FastAPI).

See `vite.config.js` for the proxy, and `src/utils/api.js` for the tiny API wrapper used by `src/ui/App.jsx`.
