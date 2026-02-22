# Timeclock Feature - Quick Reference Guide

## 🚀 Quick Start

### First Time Use
1. Navigate to Productivity Tracker
2. Click "⏱️ Clock In" to start your work day
3. Track time normally (Available/Working/Unavailable)
4. Click "⏹️ Clock Out" when done

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + I` | Clock In |
| `Ctrl/Cmd + O` | Clock Out |
| `Ctrl/Cmd + T` | Open Timecard |
| `Escape` | Close modals |

---

## 🔧 Common Operations

### View Your Timecard
1. Click "📋 Timecard" button
2. See all clock in/out entries
3. View summary stats (Total Hours, Avg Daily Hours)

### Add Forgotten Entry
1. Open Timecard
2. Click "➕ Add Manual Entry"
3. Fill in Date, Clock In/Out times, Notes
4. Click "Save Entry"

### Edit Clock Times
1. Open Timecard
2. Click "✏️ Edit" on any entry
3. Modify times or notes
4. Click "Save Entry"

### Delete Wrong Entry
1. Open Timecard
2. Click "🗑️ Delete" on entry
3. Confirm deletion

### Clean Up Out-of-Hours Data
1. If warning banner appears after clock out
2. Click "View Data" to see what will be removed
3. Click "Clean Up" to delete entries outside work hours
4. Confirm deletion

---

## 📊 Understanding the UI

### Clock Widget States

**Not Clocked In:**
```
⏰ Not Clocked In
--:--:--
[Clock In] [Timecard]
```

**Clocked In:**
```
✅ Clocked In
08:32:15
[Clock Out] [Timecard]
```

### Badges in Timecard

| Badge | Meaning |
|-------|---------|
| 🔵 Auto | Automatically created clock in/out |
| 🟠 Manual | Manually added or edited entry |
| 🟢 Open | Still clocked in (no clock out yet) |

### Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 "Daily totals filtered to clocked hours only" | Your daily totals only count time during work hours |
| 🟠 "Out-of-Hours Data Detected" | You have tracking entries outside your clock times |

---

## 💡 Best Practices

### Daily Routine
1. **Morning**: Clock in when you arrive
2. **During Day**: Track time normally (don't worry about clock)
3. **Evening**: Clock out before leaving
4. **Weekly**: Review timecard for accuracy

### If You Forget to Clock In
1. Clock in as soon as you remember
2. Later, edit the entry in Timecard to set correct time
3. Or add a manual entry with actual times

### If You Forget to Clock Out
1. Next day: You'll see out-of-hours warning
2. Edit yesterday's timecard entry to set correct clock out time
3. Click "Clean Up" to remove tracking after that time

### Editing Past Entries
- You can always edit any entry's times or notes
- Edited entries will show "Manual" badge
- Daily totals automatically recalculate

---

## 🎯 How Data Filtering Works

### Without Timeclock Entry
- All productivity tracking counts toward daily totals
- No filtering applied

### With Closed Timeclock Entry
- Only tracking between clock in and clock out counts
- Out-of-hours tracking is excluded from totals
- Filter indicator shows green badge

### Example

Clock Entry: 9:00 AM - 5:00 PM (8 hours)

Productivity Tracking:
- 8:30 AM - 9:00 AM: Working (Admin) ❌ Excluded
- 9:00 AM - 12:00 PM: Working (Admin) ✅ Counts (3h)
- 12:00 PM - 1:00 PM: Unavailable (Lunch) ✅ Counts (1h)
- 1:00 PM - 5:00 PM: Working (Maintenance) ✅ Counts (4h)
- 5:00 PM - 7:00 PM: Working (Admin) ❌ Excluded

**Daily Total**: 8 hours (only 9 AM - 5 PM)

---

## 🐛 Troubleshooting

### "Already has an open clock entry"
- You're already clocked in
- Check clock widget status
- If stuck, view Timecard and edit/delete open entry

### "No open clock entry found"
- You're not clocked in
- Click Clock In first before Clock Out

### Toast notifications not appearing
- Check browser console for errors
- Refresh page
- Ensure JavaScript is enabled

### Daily totals seem wrong
- Check if you have a closed timeclock entry (filter active)
- View Timecard to see exact clock in/out times
- Remember: only time WITHIN clock hours counts

### Out-of-hours warning won't go away
- Click "View Data" to see remaining entries
- Use "Clean Up" to remove them
- Or manually delete from history

---

## 📱 Mobile Tips

- All features work on mobile
- Swipe left/right to scroll timecard table
- Tap and hold for tooltips
- Use landscape mode for better table viewing

---

## ❓ FAQ

**Q: Can I have multiple clock entries per day?**
A: Currently one entry per day. Use "Unavailable" status for breaks/lunch.

**Q: What if I work across midnight?**
A: Clock entry uses the start date. Duration can span to next day.

**Q: Can I delete my timecard history?**
A: Yes, click Delete on any entry. This won't affect productivity tracking history.

**Q: Does this affect my existing productivity data?**
A: No! Existing data is preserved. Filtering only applies when you have clock entries.

**Q: Can admin see my timecard?**
A: Depends on implementation. By default, each user only sees their own.

**Q: How long does data keep?**
A: Forever, unless you manually delete entries.

**Q: What happens if I'm clocked in for days?**
A: Elapsed timer keeps counting. You can clock out anytime or edit the entry.

---

## 🎨 UI Colors Reference

| Color | Usage |
|-------|-------|
| 🟢 Green | Success, Available status, Filter active |
| 🔴 Red | Error, Delete actions |
| 🟠 Orange | Warning, Manual entries, Out-of-hours |
| 🔵 Blue | Info, Auto entries, Working status |
| 🟣 Purple | Unavailable status |

---

*For detailed testing procedures, see `TIMECLOCK-TESTING-PLAN.md`*
