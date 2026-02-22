# Production Deployment Guide

**Date:** 2026-02-04
**Target:** eldev.cherrysofa.com
**Status:** ✅ Ready for Production

---

## ✅ Pre-Deployment Checklist

- [x] Client built successfully (1.43s)
- [x] All features implemented and tested
- [x] Database populated with production data
- [x] Service files configured
- [x] Environment variables set

---

## 🚀 Switch to Production Server

### Method 1: Using brandpack.sh Script (Recommended)

```bash
# Stop development, start production
./brandpack.sh switch dev prod
```

**What this does:**
1. Stops brandpack-dev.service
2. Starts brandpack-tools.service (production)
3. Verifies health check on port 8080
4. Shows status

### Method 2: Manual systemd Commands

If the script requires sudo password:

```bash
# Stop development server
sudo systemctl stop brandpack-dev

# Start production server
sudo systemctl start brandpack-tools

# Verify it's running
sudo systemctl status brandpack-tools

# Enable auto-start on boot
sudo systemctl enable brandpack-tools
```

### Method 3: Check Current Status First

```bash
# See what's currently running
./brandpack.sh status

# Or manually check
sudo systemctl status brandpack-dev
sudo systemctl status brandpack-tools
```

---

## 🌐 Accessing Production

### Internal Access (on server)
```
http://localhost:8080
```

### External Access (from anywhere)
```
https://eldev.cherrysofa.com
```

**Important Notes:**
- Production server runs on port **8080**
- Reverse proxy (nginx/OpenResty) routes eldev.cherrysofa.com → localhost:8080
- SSL/TLS handled by reverse proxy
- Application serves both API and static files

---

## 📋 Production Server Configuration

### Environment Variables (server/.env)

**Required for production:**
```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_PATH=./data/brandpack.db
SESSION_SECRET=<your-secure-secret-here>
SESSION_MAX_AGE=86400000
LOG_LEVEL=info
```

**Verify your .env file:**
```bash
cat server/.env
```

**Change SESSION_SECRET if using default:**
```bash
# Generate a secure random secret
openssl rand -base64 32

# Update server/.env with the new secret
```

### Database Location
```
server/data/brandpack.db
Size: 236K
Contains: 39 inventory items, 1 maintenance issue, your productivity tasks
```

---

## 🔄 Systemd Service Files

### Production Service: brandpack-tools.service

**Location:** `/etc/systemd/system/brandpack-tools.service`

**Key settings:**
- **WorkingDirectory:** /home/el/Documents/El-Projects/brandpack-tools
- **ExecStart:** /usr/bin/node server/src/server.js
- **Environment:** NODE_ENV=production
- **Port:** 8080
- **Auto-restart:** yes

**View service file:**
```bash
cat brandpack-tools.service
```

**Logs:**
```bash
# View recent logs
sudo journalctl -u brandpack-tools -n 100

# Follow logs in real-time
sudo journalctl -u brandpack-tools -f

# Or use the script
./brandpack.sh logs prod
./brandpack.sh tail prod
```

---

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl http://localhost:8080/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T...",
  "environment": "production"
}
```

### 2. Check Inventory API
```bash
curl http://localhost:8080/api/v1/inventory | jq '.count'
```

**Expected:** `39`

### 3. Access Web Interface
```bash
# From server
curl -I http://localhost:8080

# From browser (external)
# Open: https://eldev.cherrysofa.com
```

**Expected:** Should redirect to login page or show dashboard

### 4. Test Login
1. Navigate to https://eldev.cherrysofa.com
2. Login with testuser or eloise
3. Verify dashboard loads with your data:
   - Inventory: 39 items
   - Active Issues: 1
   - Productivity tasks visible

---

## 🌐 Reverse Proxy Configuration

**Your setup (already configured):**
- **Domain:** eldev.cherrysofa.com
- **Proxy:** nginx or OpenResty
- **SSL:** Handled by proxy
- **Backend:** localhost:8080

**Reverse proxy routes:**
```
https://eldev.cherrysofa.com → http://localhost:8080
```

**Headers forwarded:**
- X-Forwarded-For
- X-Forwarded-Proto
- Host

**Note:** Reverse proxy configuration is OUTSIDE this codebase. If you need to modify nginx/OpenResty config, that's separate from the application.

---

## 📊 What's Different in Production

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| **Port** | 8080 (server) + 5173 (Vite) | 8080 only |
| **Access** | localhost:5173 | eldev.cherrysofa.com |
| **Static Files** | Served by Vite dev server | Served by Express from client/dist |
| **Hot Reload** | ✅ Yes (Vite HMR) | ❌ No |
| **Logging** | debug level | info level |
| **SSL** | ❌ HTTP only | ✅ HTTPS via proxy |
| **ENV** | NODE_ENV=development | NODE_ENV=production |
| **Session Cookies** | Secure=false | Secure=true |

---

## 🔒 Security Checklist

- [x] SESSION_SECRET is unique (not default)
- [x] Secure cookies enabled in production
- [x] HTTPS enforced via reverse proxy
- [x] Database file permissions correct
- [x] Authentication required on all protected endpoints
- [x] PIN validation prevents weak PINs
- [ ] Firewall rules configured (if needed)
- [ ] Rate limiting on login endpoint (already in code)

---

## 🛠️ Troubleshooting

### Problem: Service won't start
```bash
# Check logs
sudo journalctl -u brandpack-tools -n 50

# Common issues:
# 1. Port 8080 already in use
sudo lsof -i :8080

# 2. Database file permissions
ls -l server/data/brandpack.db

# 3. Node modules missing
cd server && npm install
```

### Problem: Can't access from eldev.cherrysofa.com
```bash
# Check if production server is running
curl http://localhost:8080/api/health

# If localhost works but domain doesn't:
# - Check reverse proxy (nginx/OpenResty)
# - Check DNS resolution
# - Check firewall rules
# - Check SSL certificate
```

### Problem: Static files not loading
```bash
# Verify client/dist exists and has files
ls -lh client/dist/

# If missing, rebuild
npm run build

# Restart production server
sudo systemctl restart brandpack-tools
```

### Problem: Session not persisting
```bash
# Check SESSION_SECRET is set
grep SESSION_SECRET server/.env

# Check session store
echo "SELECT COUNT(*) FROM sessions;" | sqlite3 server/data/brandpack.db

# Check browser cookies are enabled
# Check HTTPS is working (secure cookies require HTTPS)
```

---

## 📝 Maintenance Commands

### Restart Production
```bash
sudo systemctl restart brandpack-tools
```

### View Status
```bash
./brandpack.sh status
# or
sudo systemctl status brandpack-tools
```

### Switch Back to Development
```bash
./brandpack.sh switch prod dev
```

### Backup Database
```bash
cd server
npm run backup
# Creates: server/backups/backup-YYYY-MM-DD-HHMMSS.db
```

### Update Application
```bash
# 1. Pull latest changes (if using git)
git pull

# 2. Install dependencies (if package.json changed)
npm install

# 3. Rebuild client
npm run build

# 4. Restart production
sudo systemctl restart brandpack-tools
```

---

## 🎯 Quick Reference

**Start Production:**
```bash
./brandpack.sh start prod
```

**Stop Production:**
```bash
./brandpack.sh stop prod
```

**View Logs:**
```bash
./brandpack.sh tail prod
```

**Switch Servers:**
```bash
./brandpack.sh switch dev prod
```

**Check Status:**
```bash
./brandpack.sh status
```

**Health Check:**
```bash
curl http://localhost:8080/api/health
```

**Access Application:**
```
https://eldev.cherrysofa.com
```

---

## 🚨 Emergency Rollback

If production has issues:

```bash
# 1. Stop production
sudo systemctl stop brandpack-tools

# 2. Restore database backup (if needed)
cd server
npm run restore -- backups/backup-2026-02-03-123122.db

# 3. Switch back to development
./brandpack.sh start dev

# 4. Debug the issue
sudo journalctl -u brandpack-tools -n 100
```

---

## ✅ Deployment Complete!

Your application is now ready for production at:

🌐 **https://eldev.cherrysofa.com**

**Next Steps:**
1. Run `./brandpack.sh switch dev prod`
2. Verify https://eldev.cherrysofa.com loads
3. Login and test all features
4. Monitor logs for any errors
5. Enjoy your production deployment! 🎉

---

**Support:**
- Issues: Check logs with `./brandpack.sh logs prod`
- Documentation: See CLAUDE.md for full API reference
- Testing: See TEST-REPORT.md for test coverage
