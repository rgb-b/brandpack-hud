# Brandpack Tools v3.0.0

Professional toolkit for Brandpack Australasia proofing operations.

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start Development Servers

```bash
npm run dev
```

This starts:
- **Server:** http://localhost:8080 (API)
- **Client:** http://localhost:5173 (Frontend)

### 3. Open the Application

Open http://localhost:5173 in your browser.

## Authentication

### First-Time Setup

1. Start the server and navigate to the login page
2. Register the first user - this user automatically becomes an administrator
3. Login with your new credentials
4. (Optional) Create additional users via the Admin Panel

### Default System User

For backward compatibility with v3.0 data:
- **Username:** System
- **PIN:** 0000
- **Purpose:** Owns all data migrated from the localStorage-based v3.0

### User Management (Admin Only)

Administrators can access the Admin Panel to:
- Create new users with PIN-based authentication
- Assign admin or regular user roles
- Delete users (cannot delete yourself or System user)

### Login Page

- Access any tool → redirected to login if not authenticated
- Enter username and exactly 4-digit PIN using the PIN pad
- Session lasts 24 hours
- PIN restrictions: Cannot be all same digits (1111), sequential (1234), or common patterns (2024)

### Multi-User Productivity Tracking

Each user has their own:
- Productivity tasks and history
- Daily time totals
- Task time totals

All other tools (Inventory, Pantone, Maintenance) share data across all users.

## Available Tools

| Tool | Description |
|------|-------------|
| **Dashboard** | Homepage with stats, todos, activity feed |
| **Inventory System** | Track printer supplies across machines |
| **Productivity Tracker** | Monitor time allocation and tasks |
| **Pantone Tracker** | Manage matched Pantone colors |
| **LAB-CMYK Converter** | Color space conversion |
| **Maintenance Tracker** | Log issues and schedule maintenance |

## Project Structure

```
brandpack-tools/
├── server/         # Express.js API with SQLite
├── client/         # Vite frontend
├── legacy/         # Previous localStorage version (reference)
└── tools/          # Migration utilities
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client |
| `npm run dev:server` | Start server only |
| `npm run dev:client` | Start client only |
| `npm run build` | Build client for production |
| `npm run migrate` | Initialize database |
| `npm start` | Start production server |

## Data Storage

Data is stored in SQLite database at `server/data/brandpack.db`.

**Backup:** Copy the database file to a safe location.

**Migrate from Legacy:**
1. Open the legacy app (`legacy/dist/launcher.html`)
2. Run the export script from `tools/export-localStorage-data.js` in browser console
3. Import via the API migration endpoint

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (Recommended)
- Firefox
- Safari

## Documentation

- `CLAUDE.md` - Development guide
- `server/README.md` - API documentation
- `legacy/` - Previous version reference

---

**Made for Brandpack Australasia**
