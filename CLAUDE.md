# GBoard - Personal Dashboard

A self-hosted home dashboard with multiple themes (Zen, Classic, Terminal, Newspaper), day/night theming, and a web-based admin panel.

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
│   │   ├── routes/           # Express routers (weather, calendar, plex, pihole, photos, media, word, admin)
│   │   ├── services/         # Business logic + external API integrations
│   │   └── middleware/       # Error handler
│   └── tests/
├── frontend/         # React + Vite + Tailwind SPA (port 3000 via nginx)
│   ├── src/
│   │   ├── App.tsx           # Main app (polls admin prefs, renders active layout)
│   │   ├── components/       # Shared UI widgets (Weather, Clock, Calendar, Plex, etc.)
│   │   ├── layouts/          # Theme layouts (zen, classic, terminal, newspaper, departures, fridge, observatory, flux, mosaic, aurora, origami, bamboo, blueprint)
│   │   │   ├── index.ts      # Layout registry + LayoutProps interface
│   │   │   ├── ZenLayout.tsx
│   │   │   ├── classic/      # Classic three-column glassmorphism
│   │   │   ├── terminal/     # Green-on-black CRT terminal
│   │   │   ├── newspaper/    # Editorial broadsheet with serif typography
│   │   │   ├── departures/   # Solari split-flap airport departures board
│   │   │   ├── fridge/       # Kitchen fridge door: polaroids, magnets, sticky notes
│   │   │   ├── observatory/  # Night-sky almanac with instruments (day/night theming)
│   │   │   ├── flux/         # Weather-driven canvas particle flow field (day/night theming)
│   │   │   ├── mosaic/       # Kinetic canvas hex tessellation with data ripples (day/night theming)
│   │   │   ├── aurora/       # Lava-lamp metaballs that drift and merge (day/night theming)
│   │   │   ├── origami/      # Folded-paper diamond tessellation, flat-shaded facets (day/night theming)
│   │   │   ├── bamboo/       # Swaying reed/wave field of shaded facets (day/night theming)
│   │   │   └── blueprint/    # Architect's drawing sheet: cyanotype/vellum, HA systems schedule + thermal section (day/night theming, portrait)
│   │   ├── hooks/            # Data-fetching hooks with polling intervals
│   │   ├── utils/            # Sobriety math, milestones, moon phase, photo memories, wind, thumbor
│   │   └── types/index.ts    # Shared interfaces (duplicated from backend)
│   ├── tests/
│   └── nginx/default.conf    # SPA fallback + /api proxy to backend
├── docs/screenshots/   # Theme screenshots for README
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
| `GET /api/word` | Spanish (Mexican) word of the day — curated dataset, rotates daily | Static (date-seeded) |
| `GET /api/homeassistant` | Curated HA device/sensor summary + 24 h indoor/outdoor temp history (read-only) | 20 s states, 5 min history, last-good fallback |
| `GET /api/version` | `{ startedAt }` timestamp for deploy detection | None (polled 10s) |
| `GET /admin` | Admin panel (layout, theme, settings) | - |
| `GET /admin/theme` | Current theme + layout preferences | - |
| `PUT /admin/theme` | Update theme or layout | - |
| `GET /admin/env` | Read .env settings (grouped) | - |
| `PUT /admin/env` | Update .env settings | - |
| `POST /admin/refresh` | Trigger dashboard reload | - |
| `GET /health` | Health check (200 OK) | - |

## Architecture Notes

- **No database** — all data comes from external APIs or disk cache (photos in Docker volume)
- **Word of the day** — `GET /api/word` serves a Mexican-Spanish word (definition, conjugations for irregular verbs, example sentence) from a curated dataset (`services/wordData.ts`), rotating deterministically by local calendar date. The shared `WordOfDayWidget` (`components/WordOfDay.tsx`) renders in `currentColor` with opacity tiers, so every layout drops it into its own chrome (glass card, ASCII box, sticky note, instrument panel, etc.)
- **No frontend routing** — single-page dashboard with swappable layout themes
- **Admin panel** — self-contained HTML served by Express at `/admin`; stores preferences in `admin-prefs.json`
- **Layout system** — layout registry in `layouts/index.ts`; all themes receive the same `LayoutProps` interface; new layouts must also be added to the `LAYOUTS` array in `backend/src/routes/admin.ts` (admin panel picker + theme-section visibility)
- **Day/night theming** — `useDayNight` hook applies `html.dark`/`html.light` CSS classes; Zen, Newspaper, Observatory, Flux, Mosaic, Aurora, Origami, Bamboo, and Blueprint respond to them (shared `useIsDark` hook in `hooks/useIsDark.ts`)
- **Home Assistant** — `GET /api/homeassistant` proxies HA's `/api/states` (Bearer token auth) and curates it into a `HomeAssistantSummary`. Read-only — no service calls. Returns `configured: false` (HTTP 200) when env vars are missing so layouts can render a setup note. Rendered by the Blueprint layout's "House Systems Schedule" (`layouts/blueprint/SystemsSchedule.tsx`). The curation is what makes it readable, and all of it lives in `buildSummary`:
  - **Noise** — integration config toggles are dropped by id (`NOISE_RE`): Hue's per-behaviour bridge switches (permanently "on"), Sync Box format settings, and Pi-hole (it has its own widget). HA only exposes `entity_category` via the websocket entity registry, never in `/api/states`, so id matching is the only option
  - **Grouping** (`groupDevices`) — Hue publishes a room group light *and* every bulb in it, so a wall switch driving four synced bulbs became five rows. Numbered members (`light.kitchen_kitchen_2`) are dropped when their group exists; fixtures differing only by a trailing L/R merge into one row reporting `2/4 on`. Named members ("Sofa Light") are kept — they're separately controllable
  - **Rooms** (`detectRooms`) — areas are also websocket-only, but Hue names room group lights with a doubled slug (`light.living_room_living_room`), which yields both the room slug and its label; every entity prefixed with one belongs to that room. Devices sort room-by-room with busy rooms first, so trimming to `MAX_ROWS` only ever drops quiet kit
  - **Readouts** — the four-up strip is a fixed set (interior/exterior temperature, then each one's humidity, paired by `…_temperature` → `…_humidity`) relabelled Interior/Exterior rather than showing HA's long entity names. Temperature and humidity round to whole units
  - **Media players** — `mediaKind` distinguishes a HomePod from a TV (HA sets `device_class: tv` but leaves AirPlay speakers blank, so fall back to `volume_level`/`media_artist`), which is what tells a speaker named "Kitchen" apart from the Hue room light of the same name
- **Blueprint layout is built for the portrait wall display** — bands stacked down the sheet, not a landscape grid. The two charts share a row and the calendar/media/word-of-day share another, which buys the site photograph enough height to be a real image rather than a letterbox strip. **Only the photograph is flexible (`flex-1`); every other band is `flex-none`** — that's deliberate, and it means the sheet mathematically cannot overflow into the title block. Hard `min-h-[…]` values on several bands did overflow, repeatedly; don't reintroduce them. The chart and photo measure their own containers (`useElementSize`) and render at true pixel size, since a fixed SVG `viewBox` letterboxes badly in a wide, short band
- **Thermal history** — the same endpoint also returns `temps`: 24 h of indoor vs outdoor temperature from HA's `/api/history/period`, resampled into 48 half-hour buckets (cached 5 min separately from the 20 s states cache, since history is the expensive call). Sensors are auto-detected from `device_class: temperature` entities by name (outdoor/patio/… vs indoor/living/…) and can be pinned with `HOMEASSISTANT_{INDOOR,OUTDOOR}_TEMP_ENTITY`. HA only records on change, so buckets forward-fill the last known reading. A history failure degrades to `available: false` without blanking the device schedule. Drawn by `layouts/blueprint/ThermalProfile.tsx`
- **Kinetic canvas themes (Flux, Mosaic, Aurora, Origami, Bamboo)** — `FluxField` (particle flow field), `MosaicField` (hex tessellation + data ripples), `AuroraField` (per-pixel metaball field computed on a small canvas and bilinear-upscaled — SVG/GPU filters are too slow on the Pi), `OrigamiField` (flat-shaded folded-paper diamond tessellation that corrugates in both axes and breathes open/closed), and `BambooField` (flat-shaded reed/wave field that sways on a traveling diagonal — the original folding-paper math, kept as its own theme) each drive a single imperative `requestAnimationFrame` loop reading live data from refs (no per-frame React renders); all FPS-capped with tunables at the top of the file for low-power hardware. Shared floating widgets (clock, sober chip, glass cards, now playing) live in `components/KineticOverlay.tsx`
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
- `HOMEASSISTANT_URL`, `HOMEASSISTANT_TOKEN` — Home Assistant (long-lived access token; read-only device statuses)
- `HOMEASSISTANT_INDOOR_TEMP_ENTITY`, `HOMEASSISTANT_OUTDOOR_TEMP_ENTITY` — optional; pin the thermal-section sensors instead of auto-detecting by name
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
