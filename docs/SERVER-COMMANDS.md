# Server Commands

## Production (`brandpack-tools.service`)

Serves the built frontend + API on port **8080** via `node src/server.js`.

```bash
sudo systemctl start brandpack-tools       # Start
sudo systemctl stop brandpack-tools        # Stop
sudo systemctl restart brandpack-tools     # Restart
sudo systemctl status brandpack-tools      # Status / health check
sudo systemctl enable brandpack-tools      # Enable auto-start on boot
sudo systemctl disable brandpack-tools     # Disable auto-start on boot
```

**Logs:**
```bash
journalctl -u brandpack-tools -f           # Follow live logs
journalctl -u brandpack-tools -n 100       # Last 100 lines
journalctl -u brandpack-tools --since "1 hour ago"
```

---

## Development (`brandpack-dev.service`)

Runs both the backend (nodemon, port 8080) and the Vite frontend (port 5173) together as a background service.

```bash
sudo systemctl start brandpack-dev         # Start
sudo systemctl stop brandpack-dev          # Stop
sudo systemctl restart brandpack-dev       # Restart
sudo systemctl status brandpack-dev        # Status
```

**npm shortcuts** (from project root):
```bash
npm run dev:bg     # Start dev service + follow logs
npm run dev:stop   # Stop dev service
```

**Logs:**
```bash
journalctl -u brandpack-dev -f             # Follow live logs
journalctl -u brandpack-dev -n 100         # Last 100 lines
```

---

## Interactive Dev (foreground, from project root)

Use this when you want live terminal output with HMR and nodemon restarts visible directly.

```bash
npm run dev             # Start both server + client in terminal
npm run dev:server      # Server only (port 8080, nodemon)
npm run dev:client      # Client only (port 5173, Vite)
```

---

## Notes

- The service files live at the project root: `brandpack-tools.service` (prod) and `brandpack-dev.service` (dev).
- If you update a `.service` file: `sudo systemctl daemon-reload` before restarting.
- Production serves the built client from `client/dist/` — run `npm run build` first after frontend changes.
- Sessions are stored in `server/data/sessions.db`; restarting the server does **not** log users out.
