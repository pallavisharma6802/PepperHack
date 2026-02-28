# MadisonBites

Mobile-first PWA for Madison, WI. Scan menus or pick restaurants from a map — 4 AI agents extract dishes, photos, reviews, and macros.

## Project Structure

```
PepperHack/
├── backend/           # P1 + P2 — FastAPI, ADK agents, schema
├── src/               # P3 — React frontend
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   └── store/
├── public/            # PWA manifest, assets
├── docs/              # Project plan, prototypes
└── index.html
```

## Person 3 — Frontend Core

- **Splash** — Animated intro
- **RestaurantBrowser** — Map, filters, restaurant cards
- **RestaurantDetail** — Hero, Scan / Browse tabs
- **MenuScan** — Camera viewport, laser animation, agent status bar
- **DishesResults** — Placeholder for P4's MenuDisplay

### Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Backend

Set `VITE_API_URL` to your backend (default: `/api` proxied to localhost:8000).

### P4 Integration

When P4's MenuDisplay is ready, replace the placeholder in `src/pages/DishesResults.jsx`.

## Docs

See `docs/` for the full project plan and prototype references.
