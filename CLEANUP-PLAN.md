# Project Cleanup Plan

## Files to Remove

### Root Directory
- [ ] `BUG-REPORT.txt` - Old bug report, content in markdown docs
- [ ] `populate-data.cjs` - Temporary test script
- [ ] `data-fill.txt` - Already imported (keep if you want reference)

### Legacy Folder
- [ ] `legacy/` - Entire folder (old v2.0 code, 4.0 MB)
  - Only kept for reference
  - All features migrated to v3.0
  - Can be safely removed

### Tools Directory
- [ ] `tools/export-localStorage-data.js` - Migration tool, no longer needed
- [ ] `tools/import-backup.js` - Migration tool, no longer needed
- [ ] `tools/run-migration.js` - Duplicate (exists in server/)
- [ ] `tools/README.md` - Old migration docs

### Server Directory
- [ ] `server/add-barcode-column.js` - One-time migration
- [ ] `server/add-test-barcode.js` - Test script
- [ ] `server/run-migration.js` - Keep for migrations
- [ ] `server/verify-schema.js` - One-time verification
- [ ] `server/sync-tasks-once.js` - One-time sync

## Files to Keep

### Documentation
- ✅ `AUTH-SYSTEM-ANALYSIS.md`
- ✅ `CLAUDE.md`
- ✅ `DATA-IMPORT-SUMMARY.md`
- ✅ `MIGRATION_GUIDE.md`
- ✅ `PRODUCTION-DEPLOYMENT.md`
- ✅ `README.md`
- ✅ `TEST-REPORT.md`
- ✅ `TIMECLOCK-QUICK-REFERENCE.md`
- ✅ `TIMECLOCK-TESTING-PLAN.md`

### Scripts & Config
- ✅ `brandpack.sh` - Management script
- ✅ `brandpack-dev.service` - Dev systemd service
- ✅ `brandpack-tools.service` - Prod systemd service
- ✅ `server/clear-and-import.js` - Useful for data resets

## Recommended Actions

1. **Archive legacy folder** (optional backup before delete)
2. **Remove temporary/test scripts**
3. **Keep documentation** (all .md files)
4. **Organize remaining scripts** into server/scripts/

## Estimated Space Savings

- Legacy folder: ~4 MB
- Temporary scripts: ~50 KB
- Total: ~4 MB
