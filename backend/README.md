# Backend for Real Estate Dashboard

This is a minimal Express backend that stores a shared `properties` array in `data/properties.json` and exposes a small API for your static dashboard to consume.

## Endpoints

- `GET /api/properties` — returns array of properties
- `POST /api/properties` — replace full array (body: array)
- `PUT /api/properties/:id` — upsert a single property (body: property object)
- `DELETE /api/properties/:id` — delete a property

## Run locally

1. Install Node.js (16+ recommended)
2. From this folder:

```bash
npm install
npm start
```

3. The server will run on `http://localhost:3000` (or `PORT` from `.env`).

## Wire the frontend

In `config.js` set:

```js
window.__REAL_ESTATE_API_URL__ = 'http://localhost:3000/api';
```

Then open the frontend; it will fetch shared properties from the backend.

## Deployment suggestions

- Deploy this to a small hosted service: Render, Heroku, Railway, or Fly.io.
- Ensure the `data` folder is writeable. For production, replace the JSON file with a proper database (Postgres, SQLite, Supabase).

## Next steps (recommended)

- Add authentication to protect writes.
- Migrate storage to a database for concurrent writes and reliability.
- Add rate-limiting and CORS restrictions for production.
