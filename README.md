# COS Photography Contest

Static website for a photography contest with Top 3 voting and 2/1/1 scoring.

## What is included

- `index.html`: gallery and voting form
- `results.html`: results ranking
- `assets/data/photos.json`: sample photo catalog
- `supabase/schema.sql`: tables, constraints, and indexes
- `.github/workflows/pages.yml`: automatic GitHub Pages deployment

## 1) Enable GitHub Pages

1. Open **Settings > Pages** in your repository.
2. In **Build and deployment**, select **Source: GitHub Actions**.
3. Push to `main`.
4. Open **Actions** and wait for `Deploy GitHub Pages` to finish.

## 2) Create a Supabase project

1. Create a project at https://supabase.com
2. Go to **Project Settings > API** and copy:
   - `Project URL`
   - `anon public key`

## 3) Run database schema

1. In Supabase, open **SQL Editor**.
2. Paste `supabase/schema.sql`.
3. Run the script.

## 4) Seed initial photos in `photos`

Example:

```sql
insert into photos (id, title, image_url)
values
  ('photo_001','Sunrise on the Coast','https://...'),
  ('photo_002','Mountains at Sunset','https://...');
```

## 5) Configure frontend with Supabase

Edit `js/config.js`:

```js
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY"
};
```

Do not store service keys or secrets in this repository.

## 6) Anti-fraud limits (MVP)

Current approach uses `voter_token` in `localStorage` + `UNIQUE(voter_token)` in the database to allow one vote per browser.

Limitations:
- Users can vote again from another browser or device.
- Users can clear `localStorage` and vote again.

Recommended improvements:
- Real auth (email/OAuth)
- Backend rate limiting
- Captcha

## 7) Quick local run

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
