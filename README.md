# Secret Santa Generator

A complete, secure Secret Santa name generator for your company.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + SQLite (zero-config database)
- **Security:** Server-side admin authentication, hashed access codes, protected reveal

## Tabs
1. **Participants** — add, edit, delete, import from CSV
2. **Exclusions** — mutual "A ↔ B" rules (applied both directions)
3. **Generate Draw** — constraint-solving assignment algorithm with reciprocal-prevention setting
4. **Results** — organizer-only view, search, download CSV, print

## Participant reveal
Participants enter a personal access code at `/reveal` to see only their own recipient. No emails, no public assignment list.

## Quick start

```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../client
npm install

# 3. Configure environment
# Copy .env.example to .env and set a strong ADMIN_PASSWORD / JWT_SECRET
cp ../.env.example .env   # run from server/, or create manually

# 4. Start the backend
cd ../server
npm start

# 5. Start the frontend (in another terminal)
cd ../client
npm run dev
```

Open http://localhost:5173. Sign in as admin (default username `admin`, password from `.env`).

Full instructions: see `DEPLOYMENT.md`.

## Project structure

```
client/          React + Vite + TypeScript frontend
  src/
    pages/       Admin layout, Participants, Exclusions, Generate, Results, Login, Reveal
    components/  Tabs, alerts, dialogs, spinner
    lib/api.ts   API client
server/          Node.js + Express backend
  index.js       Entry point
  db.js          SQLite database setup
  drawAlgorithm.js Constraint-solving Secret Santa algorithm
  routes/        Admin auth, participants, exclusions, draw, results, reveal
  schema.sql     Database schema
```
