# MoviMoon XML Theme Migration

The Blogger XML theme was migrated to the Cloudflare Pages frontend while retaining the existing Pages Functions architecture.

- `public/index.html` and `public/index_2.html`: converted XML layout, sidebar, header, spotlight, catalog sections, browse filters, watchlist/history, footer, Live TV, search overlay and player/detail modals.
- `public/css/movimoon.css`: converted Blogger `<b:skin>` stylesheet with Blogger theme variables resolved to their configured default values.
- `public/js/app.js` and `public/js/app_2.js`: migrated XML client engine and supplemental fixes. TMDB calls now use `/api/tmdb/*`; player URLs now come from `/api/player-config` instead of a browser-exposed player URL.
- `functions/_shared/api.js`: expanded TMDB proxy routes/query validation and CSP for the migrated frontend dependencies.
- Blogger-only widget configuration and dynamic LinkList/PageList data were replaced by static Cloudflare-compatible HTML; ad slots are not hardcoded into the Cloudflare frontend.

## Cloudflare interaction fixes (2026-09-28)

- `public/index.html` and `public/index_2.html` explicitly load `./js/app.js` with `defer` so the frontend engine is executed on both entry files.
- The CSP now uses `script-src-attr 'unsafe-inline'` so the migrated Blogger-style `onclick`, `oninput`, `onchange`, `onerror`, etc. event attributes remain functional without enabling arbitrary inline `<script>` execution.
- Removed the empty inline `<script>` block left in the converted HTML.
- Fixed a malformed HTML comment at the beginning of both entry files.
- Added hash navigation handling for `#home`, `#movies`, `#shows`, `#trending`, `#top-rated`, `#upcoming`, `#watchlist`, `#history`, and `#live`, including direct-entry/redirected URLs.
- `public/js/app.js` and `public/js/app_2.js` are kept synchronized.
