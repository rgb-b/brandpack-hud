# Brandpack Tools - Server Terminal Commands Reference

---

## 🚀 Absolute Beginner's Guide - Start Here!

**What you need to know:** The Brandpack Tools server has two modes:
- **Development** = You're coding and making changes (easier testing)
- **Production** = The real version people use (optimized, faster)

You can only run one at a time. They both use port 8080.

### Before You Start Developing

**First time ever?** Do this once:

```bash
cd /home/el/Documents/El-Projects/brandpack-tools
npm run install:all
```

**Every time you sit down to work:**

```bash
# Go to the project folder
cd /home/el/Documents/El-Projects/brandpack-tools

# Start development mode
./brandpack.sh start dev

# Open in browser: http://localhost:5173
# You'll see the app and can make changes
```

**What's happening:** The server is running at `localhost:8080` and the website builder (Vite) is running at `localhost:5173`. Changes you make appear instantly.

### While You're Developing

- Make changes to files
- Save the files (Ctrl+S)
- Website auto-refreshes in the browser
- No need to restart anything
- Keep the terminal running (`./brandpack.sh start dev`)

### After You're Done Developing

**You want to test the "real" version?** Follow these steps:

```bash
# Stop development (you can close the terminal or press Ctrl+C)

# Go to project folder
cd /home/el/Documents/El-Projects/brandpack-tools

# Build the optimized version
npm run build

# Switch to production and start it
./brandpack.sh deploy

# Open in browser: http://localhost:8080
# This is how it runs for real users
```

**Why do this?** Development mode is great for coding, but production mode is what users experience. Always test in production before telling people it's ready.

### Swapping Between Development & Production

```bash
# If production is running and you want to go back to developing:
./brandpack.sh switch prod dev

# If development is running and you want to switch to production:
./brandpack.sh switch dev prod
npm run build
./brandpack.sh deploy
```

### Checking If Everything Is Working

```bash
# See what's running (dev, prod, or both)
./brandpack.sh status

# Quick health check (is the server alive?)
curl http://localhost:8080/api/health

# See what's happening (live log)
./brandpack.sh tail prod    # for production
# or
./brandpack.sh logs dev     # for development
```

### Important Things to Know

**The database:** All data is stored in a SQLite database at `server/data/brandpack.db`. It auto-creates on first run.

**The environment file:** There's a file at `server/.env` that has secret settings. Never share it!

**Backups:** Before making big changes, backup the database:
```bash
cd server
npm run backup
```

**If something breaks:**
```bash
# Stop everything
killall node

# Check what's using port 8080
lsof -i :8080

# Hard reset (deletes database and recreates it)
rm server/data/brandpack.db
npm run migrate
```

**Getting help:**
- Check the logs: `./brandpack.sh logs dev` or `./brandpack.sh tail prod`
- Check health: `curl http://localhost:8080/api/health`
- Look for errors in the browser console (F12 in browser)

### After Reboot (Server is Down)

```bash
cd /home/el/Documents/El-Projects/brandpack-tools

# Option 1: Start development
./brandpack.sh start dev

# Option 2: Start production (for users)
./brandpack.sh deploy
```

---

## Quick Start Guide - Running the Server

### First-Time Setup (After Cloning)

```bash
# 1. Navigate to project directory
cd /home/el/Documents/El-Projects/brandpack-tools

# 2. Install all dependencies
npm run install:all

# 3. Set up environment
cp server/.env.example server/.env
# Edit server/.env and set SESSION_SECRET to a secure value

# 4. Initialize database
npm run migrate
cd server
# Apply all migrations in order:
sqlite3 data/brandpack.db < migrations/003_service_visits.sql
sqlite3 data/brandpack.db < migrations/004_maintenance_logs.sql
sqlite3 data/brandpack.db < migrations/005_enhanced_todos.sql
sqlite3 data/brandpack.db < migrations/005_shift_countdown.sql
sqlite3 data/brandpack.db < migrations/006_productivity_v4_refactor.sql
sqlite3 data/brandpack.db < migrations/add-auth-system.sql
cd ..

# 5. Done! Now follow "Running the Server" below
```

### Running the Server - Standard Workflow

**Development Mode** (for coding):
```bash
cd /home/el/Documents/El-Projects/brandpack-tools
./brandpack.sh start dev
# Access: Client http://localhost:5173 | API http://localhost:8080/api/v1
```

**After Reboot to Production**:
```bash
cd /home/el/Documents/El-Projects/brandpack-tools

# Option 1: Quick deploy (recommended)
./brandpack.sh deploy
# Access: http://localhost:8080

# Option 2: Manual steps
npm run build                    # Build client
./brandpack.sh start prod        # Start production
sudo systemctl enable brandpack-tools  # Auto-start on reboot
```

### Development → Production Build & Deploy Workflow

```bash
# 1. Development (iterative)
./brandpack.sh start dev
# Make changes, test at http://localhost:5173
# Server auto-reloads on changes

# 2. Switch to production testing
./brandpack.sh switch prod dev   # Stops dev, prepares for prod

# 3. Build and deploy
npm run build                    # Create optimized client bundle
./brandpack.sh deploy           # Start production server
# Test at: http://localhost:8080

# 4. Verify health
curl http://localhost:8080/api/health

# 5. Enable auto-start on reboot (optional)
sudo systemctl enable brandpack-tools

# 6. Back to dev for more changes
./brandpack.sh switch prod dev   # Stops prod, restarts dev
```

### Service Management (After Deployment)

```bash
# Check if running
./brandpack.sh status

# View logs
./brandpack.sh tail prod         # Live logs
./brandpack.sh logs prod         # Full logs

# Stop production
./brandpack.sh switch prod dev   # or: sudo systemctl stop brandpack-tools

# Restart production
sudo systemctl restart brandpack-tools

# Auto-start on boot
sudo systemctl enable brandpack-tools

# Disable auto-start
sudo systemctl disable brandpack-tools
```

### Database Management

```bash
# Backup before changes
cd server && npm run backup

# Restore from backup
npm run restore

# Reset database (careful!)
rm data/brandpack.db
npm run migrate
# Then re-apply migrations (see First-Time Setup)
```

---

## Management Script (`./brandpack.sh`)

**Note:** Dev and production cannot run simultaneously (both need port 8080). Always develop in dev mode; deploy to verify.

| Command | Description |
|---------|-------------|
| `./brandpack.sh start dev` | Start development mode (server:8080 + client:5173) |
| `./brandpack.sh start prod` | Start production mode (server:8080, serves built client) |
| `./brandpack.sh deploy` | Build client + start production mode |
| `./brandpack.sh status` | Show status of all services |
| `./brandpack.sh logs dev` | View development logs |
| `./brandpack.sh tail prod` | Follow production logs in real-time |
| `./brandpack.sh switch dev prod` | Switch from dev to prod mode (stops dev, starts prod) |
| `./brandpack.sh switch prod dev` | Switch from prod to dev mode (stops prod, starts dev) |
| `./brandpack.sh -i` | Open interactive menu |

---

## NPM Scripts - Root Directory

Run these from the project root.

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install dependencies for root, server, and client |
| `npm run dev` | Start server:8080 + client:5173 concurrently (dev mode) |
| `npm run dev:server` | Start server only on :8080 with nodemon (auto-restart on file changes) |
| `npm run dev:client` | Start client only on :5173 with Vite HMR (hot reload) |
| `npm run dev:bg` | Start dev server via systemd service and tail logs |
| `npm run dev:stop` | Stop the systemd dev service |
| `npm run build` | Build client to `client/dist/` (one-time production bundle) |
| `npm start` | Start production server on :8080 (serves built client from dist) |

---

## NPM Scripts - Server Directory

Run these from `server/` directory.

| Command | Description |
|---------|-------------|
| `npm run backup` | Backup database to `server/backups/` with timestamp |
| `npm run restore` | Restore database from latest backup file |
| `npm run migrate` | Initialize/reset database (runs `init.sql`, creates fresh schema) |
| `npm run migrate:ids` | Inventory ID migration for v2→v3 upgrade |
| `npm run update:barcodes` | Update inventory barcodes from Excel spreadsheet |
| `npm run import:pantone` | Import Pantone colors from Excel spreadsheet |

---

## Database Commands

Direct SQLite commands for database management.

### Check Database Schema

```bash
# List all tables
echo "SELECT name FROM sqlite_master WHERE type='table';" | sqlite3 server/data/brandpack.db

# Show table structure
echo ".schema table_name" | sqlite3 server/data/brandpack.db

# Query active sessions
echo "SELECT * FROM productivity_active_sessions;" | sqlite3 server/data/brandpack.db

# Query users
echo "SELECT id, username, role FROM users;" | sqlite3 server/data/brandpack.db
```

### Apply Migrations Manually

After resetting database (`npm run migrate`), apply incremental schema additions:

```bash
cd server

# Service visits table
sqlite3 data/brandpack.db < migrations/003_service_visits.sql

# Maintenance logs table
sqlite3 data/brandpack.db < migrations/004_maintenance_logs.sql

# Enhanced todos
sqlite3 data/brandpack.db < migrations/005_enhanced_todos.sql

# Shift countdown
sqlite3 data/brandpack.db < migrations/005_shift_countdown.sql

# Productivity V4 refactor
sqlite3 data/brandpack.db < migrations/006_productivity_v4_refactor.sql

# Auth system
sqlite3 data/brandpack.db < migrations/add-auth-system.sql
```

---

## Systemd Service Commands

For background service management.

### Development Service

```bash
# Start dev service
npm run dev:bg

# Stop dev service
npm run dev:stop

# View status
sudo systemctl status brandpack-dev

# View live logs
journalctl -u brandpack-dev -f

# View last 50 lines of logs
journalctl -u brandpack-dev -n 50
```

### Production Service

```bash
# Start service
sudo systemctl start brandpack-tools

# Stop service
sudo systemctl stop brandpack-tools

# Enable auto-start on boot
sudo systemctl enable brandpack-tools

# Disable auto-start
sudo systemctl disable brandpack-tools

# View status
sudo systemctl status brandpack-tools

# View live logs
journalctl -u brandpack-tools -f

# View last 50 lines
journalctl -u brandpack-tools -n 50

# Restart service
sudo systemctl restart brandpack-tools
```

---

## Diagnostic & Troubleshooting Commands

Useful commands for debugging and monitoring.

### Health Check

```bash
# Quick health check
curl http://localhost:8080/api/health

# Verbose with headers
curl -v http://localhost:8080/api/health
```

### Port Monitoring

```bash
# Check what's using port 8080
lsof -i :8080

# Check what's using port 5173
lsof -i :5173

# List all listening ports
netstat -tulpn | grep LISTEN
```

### Process Management

```bash
# Find Node processes
ps aux | grep node

# Kill process by port (force)
# First find PID with lsof, then:
kill -9 <PID>

# Kill all Node processes (dangerous, use with care)
killall node
```

### Database Inspection

```bash
# Interactive SQLite shell
sqlite3 server/data/brandpack.db

# Count rows in a table
echo "SELECT COUNT(*) FROM users;" | sqlite3 server/data/brandpack.db

# Export database as SQL dump
sqlite3 server/data/brandpack.db .dump > backup.sql

# Backup database manually
cp server/data/brandpack.db server/data/brandpack.db.backup.$(date +%s)

# Check database file size
ls -lh server/data/brandpack.db
```

### Git Operations

```bash
# View current branch
git status

# View recent commits
git log --oneline -10

# Check for uncommitted changes
git diff

# Stage all changes
git add .

# Create a commit
git commit -m "message"

# Push to remote
git push origin <branch-name>
```

### Browser Cache & Reload

```bash
# Clear browser cache and hard refresh simulation:
# In browser DevTools:
# 1. Open DevTools (F12)
# 2. Right-click refresh button → "Empty cache and hard refresh"
# OR press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

## Quick Reference - Development Workflow

```bash
# 1. First time setup
npm run install:all
cp server/.env.example server/.env
# Edit server/.env and set SESSION_SECRET

# 2. Start development
./brandpack.sh start dev

# 3. In another terminal, view logs
npm run dev:server    # or
journalctl -u brandpack-dev -f

# 4. Make changes and test at:
# - Client: http://localhost:5173
# - Server API: http://localhost:8080/api/health

# 5. To switch to production testing
./brandpack.sh switch prod dev
npm run build
./brandpack.sh start prod
# Test at: http://localhost:8080

# 6. Back to development
./brandpack.sh switch prod dev

# 7. Database reset (if needed)
rm server/data/brandpack.db
npm run migrate
cd server && sqlite3 data/brandpack.db < migrations/003_service_visits.sql
```

---

## Quick Reference - Production Deployment

```bash
# 1. Build client
npm run build

# 2. Switch to production
./brandpack.sh deploy

# 3. Verify it's running
curl http://localhost:8080/api/health

# 4. Enable auto-start
sudo systemctl enable brandpack-tools

# 5. View logs
journalctl -u brandpack-tools -f

# 6. Backup database before updates
cd server && npm run backup
```

---

## Environment Variables

Edit `server/.env` (copy from `server/.env.example`):

```env
NODE_ENV=development          # Set to 'production' for prod
PORT=8080
HOST=0.0.0.0
DATABASE_PATH=./data/brandpack.db
SESSION_SECRET=your-secret    # REQUIRED - change in production!
SESSION_MAX_AGE=86400000     # 24 hours in milliseconds
LOG_LEVEL=debug              # Set to 'info' or 'error' for production
```

---

## Access Points

| Environment | URL | Port |
|------------|-----|------|
| Development Client | http://localhost:5173 | 5173 |
| Development Server API | http://localhost:8080/api/v1 | 8080 |
| Production | http://localhost:8080 | 8080 |
| Health Check | http://localhost:8080/api/health | 8080 |

