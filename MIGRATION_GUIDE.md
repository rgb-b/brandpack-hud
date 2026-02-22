# Migration Guide: v3.0 → v3.1

This guide covers upgrading from Brandpack Tools v3.0 (localStorage-based) to v3.1 (multi-user with authentication).

## What's New in v3.1

- **Multi-user authentication** with session-based login
- **Role-based access control** (Admin vs User)
- **PIN-based security** (4-6 digit PINs)
- **Per-user productivity tracking** (tasks, history, totals)
- **Admin panel** for user management
- **System user** for backward compatibility

## Breaking Changes

### Authentication Required

All tools now require authentication. Users must login before accessing any tool.

### Productivity Data Isolation

Productivity tracking is now per-user:
- Each user has their own tasks, history, and time totals
- Old data is assigned to the "System" user

### API Changes

**Productivity endpoints** no longer accept `userId` in query params or request body. User ID is extracted from the session automatically.

**Before (v3.0):**
```javascript
GET /api/v1/productivity/tasks?userId=123
POST /api/v1/productivity/tasks { userId: 123, status: 'working', name: 'Task' }
```

**After (v3.1):**
```javascript
GET /api/v1/productivity/tasks  // Uses req.user.id from session
POST /api/v1/productivity/tasks { status: 'working', name: 'Task' }
```

## Migration Steps

### 1. Backup Your Data

```bash
cd server
npm run backup
# Creates backup in server/backups/
```

### 2. Install New Dependencies

```bash
cd server
npm install express-session connect-sqlite3
```

### 3. Run Database Migration

```bash
sqlite3 server/data/brandpack.db < server/migrations/add-auth-system.sql
```

This migration:
- Adds `role` column to users table
- Creates `sessions` table for session storage
- Creates "System" user (username: System, PIN: 0000)
- Assigns all existing productivity data to System user

### 4. Configure Environment Variables

Add to `.env` (server directory):

```env
SESSION_SECRET=your-secret-key-change-this-in-production
SESSION_MAX_AGE=86400000
```

**IMPORTANT:** Change `SESSION_SECRET` to a strong random value in production!

### 5. Restart Server

```bash
npm run dev  # or npm start for production
```

### 6. Register First Admin User

1. Navigate to `http://localhost/` (or your server URL)
2. You'll be redirected to the login page
3. Click "Register" (not visible in current implementation - use direct registration)
4. First registered user becomes admin automatically

### 7. Access Migrated Data

To access your old productivity data:
- Login as "System" user (PIN: 0000)
- Or create a new user and import data via migration endpoint

### 8. Create Additional Users (Optional)

As admin:
1. Navigate to Admin Panel (user dropdown → Admin Panel)
2. Click "Create User"
3. Enter username and PIN
4. Assign role (Admin or User)

## Data Migration

### Automatic Migration

All existing data is automatically assigned to the System user:
- Productivity tasks
- Productivity history
- Daily time totals
- Task time totals

Inventory, Pantone, and Maintenance data remains shared across all users.

### Manual Data Transfer

To transfer System user's productivity data to another user, use the migration API:

```bash
# Export System user's data
curl -b cookies.txt http://localhost/api/v1/migration/export > data.json

# Login as target user, then import
curl -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d @data.json http://localhost/api/v1/migration/import
```

## Rollback Plan

If you need to rollback to v3.0:

1. Restore database backup:
   ```bash
   cd server
   npm run restore
   ```

2. Checkout v3.0 branch:
   ```bash
   git checkout v3.0
   npm run install:all
   npm run dev
   ```

3. Data will return to localStorage-based storage

## Troubleshooting

### "Session expired" errors

- Sessions last 24 hours
- Clear browser cookies and login again
- Check SESSION_MAX_AGE in .env

### Can't login as first user

- Check if users exist: `sqlite3 server/data/brandpack.db "SELECT * FROM users;"`
- Delete test users if needed to reset first-user status

### "Access denied" errors

- Check user role: Admin features require admin role
- First registered user should have role='admin'

### Migration script fails

- Ensure database file exists at `server/data/brandpack.db`
- Check SQLite version: `sqlite3 --version` (need 3.x)
- Restore from backup and try again

## Support

For issues or questions:
- Check BUG-REPORT.txt for known issues
- Review CLAUDE.md for implementation details
- Refer to USER_GUIDE.md for usage instructions
