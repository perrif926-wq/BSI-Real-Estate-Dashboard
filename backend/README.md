# Backend for Real Estate Dashboard

This is a minimal Express backend that stores a shared `properties` array in a Postgres database (`properties_store` table, single JSONB row) and exposes a small API for your static dashboard to consume. Writes require an `x-edit-key` header matching the `EDIT_KEY` environment variable.

## Endpoints

- `GET /api/properties` — returns array of properties
- `POST /api/properties` — replace full array (body: array)
- `PUT /api/properties/:id` — upsert a single property (body: property object)
- `DELETE /api/properties/:id` — delete a property

## Run locally

1. Install Node.js (16+ recommended)
2. Create a Postgres database (e.g. a free Supabase project) and run:
   ```sql
   create table if not exists properties_store (
     id integer primary key default 1,
     data jsonb not null default '[]'::jsonb
   );
   insert into properties_store (id, data) values (1, '[]'::jsonb) on conflict (id) do nothing;
   ```
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (and `EDIT_KEY` if you want write protection).
4. From this folder:

```bash
npm install
npm start
```

5. The server will run on `http://localhost:3000` (or `PORT` from `.env`).

## Wire the frontend

In `config.js` set:

```js
window.__REAL_ESTATE_API_URL__ = 'http://localhost:3000/api';
```

Then open the frontend; it will fetch shared properties from the backend.

## Deployment suggestions

- Deploy this to a small hosted service: Render, Heroku, Railway, or Fly.io.
- Set `DATABASE_URL` and `EDIT_KEY` as environment variables on the host.

## Next steps (recommended)

- Add per-user authentication instead of a single shared edit key.
- Add rate-limiting and CORS restrictions for production.
