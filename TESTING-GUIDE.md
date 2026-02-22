# Shift Countdown Widget - Testing Guide

## Quick Start

1. **Open browser:** Navigate to `http://localhost:5173`
2. **Log in:** Use your credentials
3. **Go to Dashboard:** You'll see the countdown widget

## What to Test

### ✅ Feature 1: Clock In from Dashboard

**Steps:**
1. Look at the "⏱️ Shift Countdown" widget on the dashboard
2. Should show "Not clocked in" with a blue "🕐 Clock In (HH:MM)" button
3. Click the "Clock In" button

**Expected Result:**
- ✓ Toast notification: "Clocked in successfully!"
- ✓ Widget immediately shows countdown timer
- ✓ "Today's Time" stat card updates
- ✓ Two small buttons appear: "✏️ Adjust" and "🕐 Clock Out"
- ✓ Small text shows "Clocked in at HH:MM"

---

### ✅ Feature 2: Clock Out from Dashboard

**Steps:**
1. While clocked in, click the "🕐 Clock Out" button
2. Confirmation dialog appears: "Are you sure you want to clock out?"
3. Click "OK"

**Expected Result:**
- ✓ Toast notification: "Clocked out successfully!"
- ✓ Widget returns to "Not clocked in" state
- ✓ "Today's Time" stat card updates with total time worked
- ✓ "Clock In" button reappears

**Test Cancel:**
1. Click "Clock Out" → Click "Cancel"
2. ✓ Should remain clocked in (no changes)

---

### ✅ Feature 3: Adjust Clock In Time (Forgot to Clock In)

**Scenario:** You arrived at 9:00 AM but forgot to clock in until 10:30 AM

**Steps:**
1. Clock in normally (creates entry at 10:30 AM)
2. Click the "✏️ Adjust" button
3. Prompt appears: "Adjust your clock in time: Current: 10:30"
4. Type "09:00" (without quotes)
5. Click "OK"

**Expected Result:**
- ✓ Toast notification: "Clock in time adjusted to 09:00"
- ✓ Countdown recalculates based on 9:00 AM start time
- ✓ "Clocked in at" text updates to show "09:00"
- ✓ If 8-hour shift, should show 7.5 hours remaining (not 6.5)
- ✓ "Today's Time" stat reflects correct hours

---

### ✅ Feature 4: Time Validation

**Test Invalid Formats:**
1. Click "✏️ Adjust"
2. Try these invalid inputs:
   - "25:00" → ✓ Error: "Invalid time format"
   - "14:70" → ✓ Error: "Invalid time format"
   - "abc" → ✓ Error: "Invalid time format"
   - "9:30" (single digit hour) → ✓ Should work! (accepts both "09:30" and "9:30")

**Test Future Time:**
1. Click "✏️ Adjust"
2. Enter a time 2 hours in the future
3. ✓ Error: "Clock in time cannot be in the future"

**Test Old Time:**
1. Click "✏️ Adjust"
2. Enter a time from yesterday (>24 hours ago)
3. ✓ Warning: "This time is more than 24 hours ago. Are you sure?"
4. Click "Cancel" → ✓ No changes
5. Try again and click "OK" → ✓ Accepts adjustment

---

### ✅ Feature 5: Configure Shift Length

**Steps:**
1. Click the ⚙️ icon in the widget header
2. Prompt appears: "Set your standard shift length (hours): Current: 8 hours"
3. Type "6" (for 6-hour shift)
4. Click "OK"

**Expected Result:**
- ✓ Toast notification: "Shift length updated to 6 hours"
- ✓ Countdown label changes to "remaining in 6h shift"
- ✓ Countdown recalculates (if clocked in)
- ✓ Refresh page → setting persists

---

### ✅ Feature 6: Overtime Display

**Natural Test (requires waiting):**
1. Clock in normally
2. Wait until your shift ends (e.g., 8 hours)
3. ✓ Countdown shows "+HH:MM:SS overtime (shift ended)" in RED

**Quick Test (manual database edit):**
```bash
# Set clock in to 9 hours ago
node -e "
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./server/data/brandpack.db');
const nineHoursAgo = Date.now() - (9 * 3600000);
db.run('UPDATE timeclock_entries SET clock_in = ? WHERE clock_out IS NULL', [nineHoursAgo], (err) => {
  if (err) console.error(err);
  else console.log('Clock in time set to 9 hours ago');
  db.close();
});
"
```

Then refresh dashboard:
- ✓ Should show overtime in red (e.g., "+01:00:15 overtime")

---

### ✅ Feature 7: Real-Time Updates

**Steps:**
1. Clock in from dashboard
2. Watch the countdown for 10 seconds

**Expected Result:**
- ✓ Countdown decrements every second
- ✓ No flickering or jumping
- ✓ Buttons remain stable (don't re-render constantly)

---

### ✅ Feature 8: Multi-Tab Sync

**Steps:**
1. Open dashboard in two browser tabs
2. Clock in from Tab 1
3. Wait 5-10 seconds
4. Switch to Tab 2

**Expected Result:**
- ⚠️ Tab 2 will NOT auto-update (not real-time synced)
- ✓ Refresh Tab 2 → Shows correct clocked-in state
- ✓ Both tabs show same countdown after refresh

**Note:** This is expected behavior. The countdown widget doesn't poll for updates like the productivity tracker does. Dashboard auto-refreshes every 30 seconds for stats, so clock status will sync then.

---

### ✅ Feature 9: Page Refresh Persistence

**Steps:**
1. Clock in from dashboard
2. Adjust clock in time to 2 hours ago
3. Configure shift length to 10 hours
4. Hard refresh browser (Ctrl+Shift+R)

**Expected Result:**
- ✓ Still clocked in
- ✓ Countdown shows correct time based on adjusted clock in
- ✓ Shift length still shows 10 hours
- ✓ All settings persist

---

## Visual States Checklist

### State 1: Not Clocked In
```
┌─────────────────────────────────┐
│ ⏱️ Shift Countdown          ⚙️ │
├─────────────────────────────────┤
│                                 │
│      Not clocked in             │
│      Start your shift timer     │
│                                 │
│   [🕐 Clock In (14:23)]         │
│                                 │
└─────────────────────────────────┘
```
- [ ] Shows "Not clocked in" text
- [ ] Shows "Start your shift timer" hint
- [ ] Shows blue "Clock In" button with current time
- [ ] No countdown displayed

### State 2: Active Countdown (Normal)
```
┌─────────────────────────────────┐
│ ⏱️ Shift Countdown          ⚙️ │
├─────────────────────────────────┤
│                                 │
│         05:23:14                │
│    remaining in 8h shift        │
│    Clocked in at 09:00          │
│                                 │
│   [✏️ Adjust] [🕐 Clock Out]   │
│                                 │
└─────────────────────────────────┘
```
- [ ] Shows countdown in large numbers (blue)
- [ ] Shows "remaining in Xh shift" label
- [ ] Shows "Clocked in at HH:MM" in small text
- [ ] Shows "Adjust" button (smaller, secondary)
- [ ] Shows "Clock Out" button (smaller, primary)
- [ ] Countdown decrements every second

### State 3: Overtime (Red Warning)
```
┌─────────────────────────────────┐
│ ⏱️ Shift Countdown          ⚙️ │
├─────────────────────────────────┤
│                                 │
│         +00:15:23               │
│    overtime (shift ended)       │
│    Clocked in at 09:00          │
│                                 │
│   [✏️ Adjust] [🕐 Clock Out]   │
│                                 │
└─────────────────────────────────┘
```
- [ ] Shows countdown in RED with + prefix
- [ ] Shows "overtime (shift ended)" label
- [ ] Shows "Clocked in at HH:MM" in small text
- [ ] Shows "Adjust" and "Clock Out" buttons
- [ ] Countdown increments every second (counting up)

---

## Troubleshooting

### Issue: Widget shows "⚠️ Unable to load countdown"
**Solutions:**
1. Check browser console for errors (F12)
2. Verify server is running: `./brandpack.sh status`
3. Check API health: `curl http://localhost:8080/api/health`
4. Hard refresh: Ctrl+Shift+R

### Issue: Buttons don't appear
**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for JavaScript errors
3. Verify you're logged in (check for "Not authenticated" errors)

### Issue: "Clock In" button doesn't work
**Solutions:**
1. Check browser console for errors
2. Verify backend is responding: `curl -X POST http://localhost:8080/api/v1/productivity/clock-in`
3. Check you're not already clocked in (navigate to Productivity Tracker to verify)

### Issue: Adjust time doesn't save
**Solutions:**
1. Check you entered valid HH:MM format
2. Verify time is not in the future
3. Check browser console and network tab for API errors
4. Ensure you have permission to update your own timecard

### Issue: Countdown shows wrong time
**Solutions:**
1. Click "✏️ Adjust" to verify actual clock in time
2. Check "Today's Time" stat card for total elapsed
3. Navigate to Productivity Tracker → Click "📋 Timecard" to see raw data
4. Verify shift length setting (click ⚙️) matches your expected shift

---

## Browser Console Commands

### Check current clock status:
```javascript
const response = await fetch('/api/v1/productivity/clock-status', {
    credentials: 'include'
})
const data = await response.json()
console.log(data)
```

### Manually clock in:
```javascript
await fetch('/api/v1/productivity/clock-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ timestamp: Date.now() })
})
```

### Check shift length:
```javascript
const response = await fetch('/api/v1/users/me/shift-length', {
    credentials: 'include'
})
const data = await response.json()
console.log('Shift length:', data.data.shift_length_hours, 'hours')
```

---

## Performance Testing

### CPU Usage (should be minimal)
1. Open Task Manager / Activity Monitor
2. Clock in from dashboard
3. Monitor browser process CPU usage
4. ✓ Should be <5% CPU (countdown updates every second)

### Memory Leaks (should not increase over time)
1. Open browser DevTools → Memory tab
2. Take heap snapshot
3. Let dashboard run for 5 minutes
4. Take another heap snapshot
5. ✓ Memory should be stable (no significant growth)

### Network Requests (should be minimal)
1. Open browser DevTools → Network tab
2. Clock in
3. Watch for 30 seconds
4. ✓ Should see ONE request to `/clock-in`
5. ✓ Should see ONE request to `/dashboard/stats` (refresh)
6. ✓ Should NOT see repeated `/clock-status` requests every second

---

## Accessibility Testing

### Keyboard Navigation
1. Tab through page elements
2. ✓ Can focus on "Clock In" button
3. ✓ Can focus on "Adjust" and "Clock Out" buttons
4. ✓ Can activate buttons with Enter key

### Screen Reader (if available)
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate to countdown widget
3. ✓ Announces countdown time
4. ✓ Announces button labels clearly
5. ✓ Announces state changes after actions

---

## Success Criteria

All tests should pass:
- [ ] Can clock in from dashboard without navigating to Productivity Tracker
- [ ] Can clock out from dashboard with confirmation
- [ ] Can adjust clock in time to fix forgotten clock in
- [ ] Time validation works (rejects future times, invalid formats)
- [ ] Shift length configuration persists across sessions
- [ ] Overtime displays in red when shift ends
- [ ] Countdown updates every second without flickering
- [ ] Settings persist after page refresh
- [ ] Toast notifications show for all actions
- [ ] Quick stats update after clock operations

---

**Test Environment:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Database: server/data/brandpack.db

**Happy Testing! 🎉**
