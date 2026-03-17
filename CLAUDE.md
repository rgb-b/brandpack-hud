# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (run once after cloning)
npm run install:all

# Start both server and client in development mode
npm run dev

# Start server only (port 8080)
npm run dev:server

# Start client only (port 5173)
npm run dev:client

# Initialize/reset database schema
npm run migrate

# Build frontend for production
npm run build
```

**Server-specific scripts** (run from `server/` directory):
```bash
node scripts/import-pantone-spreadsheet.js  # Import colors from Excel
node scripts/backup-database.js             # Backup the SQLite database
node scripts/restore-database.js            # Restore from backup
```

There are no automated tests. See `docs/TESTING-GUIDE.md` for manual testing procedures.

## Architecture Overview

Brandpack Tools is a full-stack productivity app for proofing room operations. The root `package.json` orchestrates both workspaces via `concurrently`.

### Backend (`server/`)

Express.js + SQLite, ES modules (`type: "module"`). Entry point: `src/server.js`.

**Pattern: Model → Route → Middleware**
- `src/models/*.model.js` — All database logic. Each model exports functions that call `db.run/get/all` on the SQLite connection. The `config/database.js` singleton wraps the callback-based `sqlite3` driver into Promises via `promisifyDb()`.
- `src/routes/*.js` — Route handlers. All async route callbacks are wrapped in `asyncHandler()` from `middleware/errorHandler.js` to catch unhandled Promise rejections.
- `src/middleware/` — `auth.js` (requireAuth, requireAdmin), `errorHandler.js`, `rateLimiter.js`, `validateRequest.js`
- `src/utils/responses.js` — All API responses use this: `{ success: bool, data, error?, message? }`. Use `success()`, `error()`, `notFound()`, `validationError()` helpers.

**API base path:** `/api/v1/`
**Routes:** `/inventory`, `/productivity`, `/productivity/v4`, `/pantone`, `/maintenance`, `/dashboard`, `/migration`, `/users`, `/search`

**Authentication:** Session-based (express-session + connect-sqlite3). PIN login (bcrypt, 10 rounds). `requireAuth` checks `req.session.userId`; `requireAdmin` checks `req.session.user.role === 'admin'`.

**Database:** SQLite at `server/data/brandpack.db`. WAL mode, foreign keys enabled. Schema in `migrations/init.sql`. The server auto-migrates missing columns on startup. Key data ownership: productivity data is **per-user**; inventory, pantone, and maintenance data is **shared** across all users.

### Frontend (`client/`)

Vanilla JavaScript + Vite (no framework). Each tool is a fully independent HTML+JS entry point. Vite proxies `/api` → `http://localhost:8080` in dev.

**Tool entry points** in `src/tools/`:
- `login/`, `launcher/`, `admin/` — Auth and navigation
- `inventory/`, `productivity/`, `productivity-v4/`, `pantone/`, `converter/`, `maintenance/` — Feature tools

**Shared code** in `src/shared/`:
- `api/client.js` — Unified fetch wrapper with 15s timeout, automatic toast errors, JSON parsing
- `utils/auth.js` — Login/logout/session guard (`requireAuth()` redirects to login if no session)
- `utils/theme.js` — Canonical pattern for localStorage-persisted, cross-tab-synced settings (use as template for new global toggles)
- `utils/lowEnergy.js` — Low Energy mode; localStorage key `brandpack:lowEnergy`, DOM attr `data-low-energy`, event `lowenergychange`
- `utils/storage.js`, `utils/datetime.js`, `utils/keyboard.js`, `utils/export.js`, `utils/validation.js` — General helpers
- `components/` — AppHeader (web component, present on all pages), AppFooter, Toast, CommandPalette, SearchModal

**Global UI toggles** (theme, low energy, etc.) follow the pattern in `utils/theme.js`: localStorage key → DOM attribute on `<html>` → dispatched CustomEvent → CSS rules in `components.css`.

**Barcode scanning:** `onscan.js` library (the only runtime npm dependency).

### Environment

Copy `server/.env.example` to `server/.env`. Key variables:
```
NODE_ENV=development
PORT=8080
HOST=0.0.0.0
DATABASE_PATH=./data/brandpack.db
SESSION_SECRET=<32-byte-hex-string>  # required in production
SESSION_MAX_AGE=86400000
```

### Production

**URL:** `https://eldev.cherrysofa.com` (reverse proxied via nginx/OpenResty → `localhost:8080`)

`brandpack.sh` is a management script in the project root for switching between dev/prod, checking status, and tailing logs:
```bash
./brandpack.sh status
./brandpack.sh switch dev prod   # stop dev, start production
./brandpack.sh tail prod         # follow production logs
```

See `docs/DEPLOYMENT.md` for the full deployment workflow and `docs/SERVER-COMMANDS.md` for raw systemd commands.

### Docs

- `docs/HOW-IT-WORKS.md` — Plain-language system overview for anyone
- `docs/DEPLOYMENT.md` — Production deployment, switching, troubleshooting
- `docs/SERVER-COMMANDS.md` — systemd start/stop/restart/logs commands
- `docs/TESTING-GUIDE.md` — Manual testing procedures
- `docs/CYBERPUNK-CSS-REFERENCE.md` — CSS classes and variables for the Cyberpunk theme
- `docs/INVENTORY-ORDER-REFERENCE.md` — Product codes and order sources for printer supplies
- `docs/TIMECLOCK-QUICK-REFERENCE.md` — User guide for timeclock/shift features
- `docs/BACKLOG.md` — Open bugs and feature requests
