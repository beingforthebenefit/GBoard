# GBoard - Personal Dashboard

A home dashboard that displays weather, calendar, Plex activity, Pi-hole stats, sobriety counter, astrology, and rotating iCloud photos with a glassmorphism UI.

## Quick Reference

All building and testing must be done inside Docker containers — do not run npm commands on the host.

```bash
# Run tests (always do this before committing)
docker compose run --rm --build backend-test npm test
docker compose run --rm --build frontend-test npm test

# Lint & format check
docker compose run --rm --build backend-test sh -c "npm run lint && npm run format:check"
docker compose run --rm --build frontend-test sh -c "npm run lint && npm run format:check"

# TypeScript check
docker compose run --rm --build backend-test npm run typecheck
docker compose run --rm --build frontend-test npm run typecheck

# Deploy
# Backend-only changes: rebuild backend (triggers frontend auto-reload via /api/version polling)
docker compose up --build --force-recreate -d backend
# Frontend code changes: rebuild frontend FIRST, then backend to trigger reload
docker compose up --build --force-recreate -d frontend
docker compose up --build --force-recreate -d backend
```

## Project Structure

```
GBoard/
├── backend/          # Express + TypeScript API server (port 3001)
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── types/index.ts    # Shared TypeScript interfaces
│   │   ├── routes/           # Express routers (weather, calendar, plex, pihole, photos, media)
│   │   ├── services/         # Business logic + external API integrations
│   │   └── middleware/       # Error handler
│   └── tests/
├── frontend/         # React + Vite + Tailwind SPA (port 3000 via nginx)
│   ├── src/
│   │   ├── App.tsx           # Main layout (single-page dashboard, no routing)
│   │   ├── components/       # UI widgets (Weather, Clock, Calendar, Plex, etc.)
│   │   ├── hooks/            # Data-fetching hooks with polling intervals
│   │   ├── utils/            # Sobriety math, astrology calculations
│   │   └── types/index.ts    # Shared interfaces (duplicated from backend)
│   ├── tests/
│   └── nginx/default.conf    # SPA fallback + /api proxy to backend
├── docker-compose.yml
├── .env                      # Runtime config (see .env.example)
└── .github/workflows/ci.yml  # Lint + test + Docker build on push/PR to main
```

## Tech Stack

- **Backend**: Node 20, Express 4, TypeScript 5.5, CommonJS
- **Frontend**: React 18, Vite 5, TypeScript 5.5, Tailwind 3, ESM
- **Testing**: Vitest 2 (backend: node env, frontend: jsdom + React Testing Library)
- **Linting**: ESLint 8 + @typescript-eslint; Prettier (no semis, single quotes, trailing commas)
- **Deployment**: Docker Compose (node:20-alpine + nginx:alpine), multi-stage builds

## API Endpoints

| Endpoint | Description | Cache |
|---|---|---|
| `GET /api/weather` | Current conditions + 4-day forecast (OpenWeatherMap) | 10 min |
| `GET /api/calendar` | Merged events from ICS/CalDAV URLs (5-day window) | 15 min |
| `GET /api/plex` | Active Plex playback sessions | None (polled 30s) |
| `GET /api/plex/thumb?path=...` | Proxy Plex thumbnails (hides token) | 1 hour |
| `GET /api/photos` | List of cached iCloud photo filenames | Syncs hourly |
| `GET /api/photos/image/:filename` | Serve cached photo file | - |
| `GET /api/media` | Next 10 upcoming TV/movies (Sonarr/Radarr, 14-day window) | 30 min |
| `GET /api/pihole` | Pi-hole query stats + top clients (v6 API) | None (polled 1 min) |
| `GET /api/version` | `{ startedAt }` timestamp for deploy detection | None (polled 10s) |
| `GET /health` | Health check (200 OK) | - |

## Architecture Notes

- **No database** — all data comes from external APIs or disk cache (photos in Docker volume)
- **No frontend routing** — single-page dashboard layout in App.tsx
- **No state management library** — plain React hooks (useState/useEffect) with polling
- **Security**: All external API calls proxy through backend; no secrets exposed to browser
- **Auto-reload**: Frontend polls `/api/version` every 10s; page reloads when backend restarts
- **Photo background**: iCloud album synced to `/data/photos/` volume; rotates every 5 min with fade

## Code Style

- Prettier: no semicolons, single quotes, 2-space indent, trailing commas (es5), 100 char width
- `_` prefix for intentionally unused function parameters
- No explicit return types required (TypeScript)
- Shared types defined in `*/src/types/index.ts` (kept in sync manually between frontend/backend)

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `OPENWEATHER_API_KEY`, `WEATHER_LAT`, `WEATHER_LON` — weather data
- `PLEX_URL`, `PLEX_TOKEN` — Plex server
- `ICAL_URLS` — comma-separated ICS/CalDAV URLs
- `ICLOUD_ALBUM_URL` — iCloud shared album
- `PIHOLE_URL`, `PIHOLE_PASSWORD`, `PIHOLE_CLIENT_ALIASES` — Pi-hole v6
- `SONARR_URL`, `SONARR_API_KEY` — Sonarr (upcoming TV episodes)
- `RADARR_URL`, `RADARR_API_KEY` — Radarr (upcoming movies)
- `SOBRIETY_DATE` / `VITE_SOBRIETY_DATE` — sobriety counter (backend + Vite build-time)
- `PORT` (default 3000), `BACKEND_PORT` (default 3001)

## CI/CD

GitHub Actions runs on push/PR to main:
1. Lint + format check + typecheck + tests (both frontend and backend)
2. Docker build (backend + frontend images + compose)

## Maintaining This File

This is a living document. Update it when you add new endpoints, change the project structure, introduce new environment variables, modify the tech stack, or alter build/deploy workflows.
