# Deployment Guide — Secret Santa Generator

This guide walks you through getting the app running locally and deploying it so your coworkers can use it.

No cloud account is required to run it locally. You only need an account if you choose to host it online.

---

## Prerequisites (install once)

1. **Node.js** (includes `npm`)
   - Download from https://nodejs.org/ (LTS version).
   - Verify: open a terminal and run `node -v` and `npm -v`.
2. **Git** (optional, for deploying): https://git-scm.com/

---

## Project layout

```
secret-santa-generator/
├── client/          React + TypeScript + Vite frontend
├── server/          Node.js + Express + SQLite backend
├── .env.example     Environment variable template
├── README.md
└── DEPLOYMENT.md    (this file)
```

---

## Stage A — Run locally (recommended first)

### 1. Open a terminal in the project folder

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Install frontend dependencies
```bash
cd ../client
npm install
```

### 4. Configure environment variables

From the `server/` folder, create a `.env` file:

```bash
copy ..\.env.example .env      # Windows
# or manually create server/.env based on .env.example
```

Edit `server/.env` and **change at least these**:

```
ADMIN_USERNAME=organizer
ADMIN_PASSWORD=SomeStrongPassword123
JWT_SECRET=a-long-random-secret-string
```

> ⚠️ Never share `JWT_SECRET` or the admin password. These protect the organizer dashboard.

### 5. Start the backend
```bash
cd server
npm start
```
You should see: `Secret Santa server running on http://localhost:5000`

### 6. Start the frontend (new terminal window)
```bash
cd client
npm run dev
```
Open **http://localhost:5173** in your browser.

### 7. Sign in
- Go to http://localhost:5173/admin
- Username: whatever you set as `ADMIN_USERNAME` (default `admin`)
- Password: whatever you set as `ADMIN_PASSWORD` (default `admin123`)

---

## Stage B — Test the draw (10 required tests)

Use the local app to verify each test below before deploying.

| Test | What to do | Expected result |
|------|------------|-----------------|
| 1 | Add 3 participants, no exclusions, generate draw | Valid draw, nobody gets self |
| 2 | Add 5 participants + several mutual exclusions, generate | Valid draw respecting exclusions |
| 3 | Enable "Prevent reciprocal assignments", generate | No A→B and B→A pairs |
| 4 | Add 3 participants + exclude every possible pair | Error: "No valid Secret Santa assignment is possible..." |
| 5 | Try to add a duplicate name | Error: name already exists |
| 6 | On /reveal, enter another participant's code | "Invalid access code" — only own recipient shown |
| 7 | On /reveal without logging in | Cannot access admin pages; redirected to sign in |
| 8 | Generate draw | Nobody is assigned to themselves |
| 9 | Exclude A↔B, generate | A never gets B, B never gets A |
| 10 | Exclude B↔A (same rule), generate | Same mutual protection — no A→B or B→A |

---

## Stage C — Deploy online (choose one option)

### Option 1: Single-service deployment (recommended, simplest)

The backend Express server also serves the built frontend, so you deploy **one** service.

**Recommended hosts (beginner-friendly, free tiers available):**
- **Render** — https://render.com (free web service)
- **Railway** — https://railway.app
- **Fly.io** — https://fly.io

**Steps (Render example):**

1. Push your code to a GitHub repository.
2. In Render, create a new **Web Service** and connect the repo.
3. Set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build` *(see note below)*
   - **Start Command:** `npm start`

   Wait — the frontend must be built into `server/public` so Express can serve it. Add a build step that builds the client first. The simplest approach:

   In `server/package.json`, add a `"postinstall"` or use Render's build command:
   ```
   cd ../client && npm install && npm run build && cd ../server && npm install
   ```
   That's awkward on some hosts. Easier: add a small `build-all.sh` or use a root `package.json`.

   **Simplest reliable approach:** create a root `package.json` with a `postinstall` that installs and builds both:

   ```json
   {
     "name": "secret-santa",
     "scripts": {
       "postinstall": "cd client && npm install && npm run build && cd ../server && npm install",
       "start": "cd server && npm start"
     }
   }
   ```
   Then set the repo root as the project, build command `npm install`, start `npm start`. The `vite.config.ts` already builds the client into `server/public`.

4. Add environment variables in the Render dashboard (same keys as `.env`):
   - `PORT`, `NODE_ENV=production`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`
5. Deploy. Render gives you a URL like `https://secret-santa-xyz.onrender.com`.

**Important:** On Render's free tier, the service "spins down" after inactivity. The first visit may take ~30 seconds to wake up. That's fine for testing; upgrade for instant response.

### Option 2: Separate frontend + backend

- **Frontend:** Vercel (vercel.com) or Netlify (netlify.com) — free, connect GitHub repo, set build command `npm run build` in the `client` folder, output `dist`.
- **Backend:** Render/Railway — deploy the `server` folder.
- Set the frontend env var `VITE_API_URL=https://your-backend.onrender.com/api`.
- Enable CORS: the backend already allows all origins (`origin: true`).

> ⚠️ Frontend hosting alone does **not** provide secure participant authentication. The backend must be deployed and handle admin login + reveal authorization, as this app does.

---

## Stage D — Share with participants

1. Sign in to the admin dashboard at your deployed URL.
2. Add participants (Participants tab).
3. Add any mutual exclusions (Exclusions tab).
4. Check "Prevent reciprocal assignments" (on by default).
5. Click **Generate Draw** (confirm).
6. Click **Generate access codes** — copy each code and share it privately with the matching participant (e.g., by hand, Slack DM, printed slip). **Do not post codes publicly.**
7. Give participants the public website URL and tell them to go to `/reveal` and enter their code.
8. Only you (admin) can see the full list (Results tab). Participants see only their own recipient.

---

## Security notes

- Admin passwords and JWT secrets are stored in environment variables, never in frontend code.
- Access codes are hashed with bcrypt before storage; the plain code is shown to the admin only once at generation time.
- The reveal endpoint returns only the requesting participant's recipient. The full assignment list is never sent to the reveal page.
- Nothing is stored in browser `localStorage` except the admin session token (while signed in).
- Change the default `ADMIN_PASSWORD` and `JWT_SECRET` before sharing the URL.

---

## Hosting costs & limitations

| Host | Free tier | Notes |
|------|-----------|-------|
| Render | Yes | Spins down on free tier; 1 web service |
| Railway | Trial credit then paid | Easy deploy, no indefinite free tier |
| Vercel/Netlify | Yes (static) | Frontend only; pair with a backend host |
| Fly.io | Small free allowance | Requires credit card for verification |

SQLite stores everything in one file (`server/database.sqlite`). It's perfect for small-to-medium groups and needs no database server. Back up that file occasionally.
