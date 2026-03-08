# GBoard

A self-hosted dashboard — a Dakboard replacement. Runs in Docker, accessible via browser on your local network.

## Features

- **Weather** — Current conditions, 3-day forecast, sunrise/sunset (OpenWeatherMap)
- **Sun Arc** — Two visual representations side-by-side (wide track and orbital earth)
- **Clock & Date** — Live 12-hour digital clock with seconds
- **Astrology Snapshot** — Sun sign of the day, sign date range, moon phase, weekday ruler insights, and matching constellation view in a center widget
- **Sober Counter** — Years / months / days / hours since your sobriety date
- **Pi-hole Widget** — DNS blocking status, key stats, and compact top-client list
- **Plex Now Playing** — Shows all active streams as cards; progress animates smoothly between backend polls, with an idle placeholder when no one is streaming
- **Calendar** — 7-day rolling view from iCloud shared CalDAV/ICS calendars
- **Photo Background** — Rotating photos from an iCloud shared album with dual-layer backdrop (sharp foreground + blurred fill), with failed image loads retried every 5 seconds

## Quick Start

```bash
cp .env.example .env
# Edit .env with your API keys, Plex token, iCloud URLs, etc.

docker compose up -d
```

Access the dashboard at `http://<your-machine-ip>:3000`

## Environment Variables

| Variable | Description |
|---|---|
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key (free tier) |
| `WEATHER_LAT` | Location latitude |
| `WEATHER_LON` | Location longitude |
| `SOBRIETY_DATE` | ISO 8601 sobriety start date (e.g. `2025-07-07T00:00:00`) |
| `VITE_SOBRIETY_DATE` | Same as above — required for frontend build |
| `PLEX_URL` | Plex server URL (e.g. `http://192.168.1.100:32400`) |
| `PLEX_TOKEN` | Plex authentication token |
| `ICAL_URLS` | Comma-separated iCloud CalDAV/ICS share URLs |
| `ICLOUD_ALBUM_URL` | iCloud shared album URL |
| `PIHOLE_URL` | Pi-hole base URL (e.g. `http://192.168.1.100`) |
| `PIHOLE_PASSWORD` | Pi-hole web/API password |
| `PIHOLE_CLIENT_ALIASES` | Optional comma-separated alias map for client labels (example: `192.168.1.22=Gerald's iPhone,192.168.1.23=Gerald's iPad`) |
| `PORT` | Frontend port (default: `3000`) |
| `BACKEND_PORT` | Backend API port (default: `3001`) |

### Getting your Plex token

In Plex Web, open any media item → `...` → `Get Info` → `View XML`. The token is the `X-Plex-Token` query param in the URL.

### Getting iCloud calendar URLs

In iCloud.com or Calendar app: share a calendar → enable public calendar → copy the URL. Change `webcal://` to `https://`.

### Getting the iCloud album URL

In Photos app on iPhone/Mac: select a Shared Album → share → copy link. Paste the full `https://www.icloud.com/photos/share/...` URL.

## Development

```bash
# Backend (runs on :3001)
cd backend && npm install && npm run dev

# Frontend (runs on :5173, proxies /api to :3001)
cd frontend && npm install && npm run dev
```

## Deploying Changes

```bash
docker compose up --build -d
```

- Rebuilds and restarts backend/frontend containers with the latest code.
- Connected dashboards auto-refresh after deploy when backend startup time changes (`/api/version` poll every 10 seconds, no-cache).

## Architecture

```
Raspberry Pi Browser
       │
       ▼
Nginx  (port 3000)
  ├─ Serves React SPA
  └─ Proxies /api/* ──▶ Node.js API (port 3001)
                             ├─ /api/weather  ──▶ OpenWeatherMap
                             ├─ /api/calendar ──▶ iCloud CalDAV ICS
                             ├─ /api/pihole   ──▶ Pi-hole
                             ├─ /api/plex     ──▶ Plex (local LAN)
                             └─ /api/photos   ──▶ iCloud shared album
```

API keys and tokens are **never** exposed to the browser — all external API calls go through the backend.
