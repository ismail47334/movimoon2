

## v34 — Search Console verification + ad CSP cleanup

- Added Google Google Search Console HTML meta-tag verification at `public/google50e900902ba1704.html`.
- Updated both CSP layers (`public/_headers` and `functions/_shared/api.js`) to allow `'unsafe-eval'` because the currently configured third-party ad `invoke.js` uses string-based JavaScript evaluation.
- Removed the redundant `allowfullscreen` iframe attribute; `allow="fullscreen ..."` already grants fullscreen and avoids the browser warning seen in DevTools.
- Bumped existing `?v=32` cache-busting references to `?v=33`.
- No TMDB, Live TV, player, routing, watchlist, history, information-page, contact-form, or analytics functionality was intentionally changed.

# MoviMoon — FINAL v32

## 1. What this ZIP is

This archive is the **MoviMoon FINAL v32** build for the Cloudflare Pages project.

Primary site/domain:

- `https://movimoon.pages.dev`

Secondary/older site URL that may still exist:

- `https://movimoon3.pages.dev`

The build is based on the previous v31 project. It keeps the working Live TV and ad/CSP fixes and adds the final information pages, a simple contact form, and Google Analytics 4.

> **Important:** The ZIP has been statically checked (file structure, JavaScript syntax, configuration references, CSP sources, and ZIP integrity). Third-party ad delivery itself can only be confirmed after deployment in a real browser because Adsterra/Monetag control the final ad response.

---

## 2. v31 foundation retained

### 2.1 Live TV — v30 fix retained

Live TV loads its editable configuration from:

```text
/public/data/live-tv.json
```

Current content:

```json
{
  "playlistUrl": "https://raw.githubusercontent.com/ismail47334/movimoon-iptv-playlist/refs/heads/main/movimoon-iptv-playlist.m3u"
}
```

The browser path is:

```text
https://movimoon.pages.dev/data/live-tv.json
```

The Live TV code uses a captured `self` reference inside the async initialization function. This avoids the previous `this`-context bug that caused the misleading config 404 and `this.showError is not a function` error.

There is also a direct playlist fallback using the same public GitHub M3U URL if the small JSON config cannot be fetched.

Live TV remains **direct playlist playback**. The old `livetv.md-ismail.workers.dev` TV relay is not used.

### 2.2 Live TV filtering/playback

The current Live TV implementation includes:

- Channel search
- Continent filter
- Country filter
- Genre/category filter
- Channel counts
- M3U parsing from `#EXTINF` metadata
- Country/continent mapping
- Channel logos when supplied by the playlist
- Browser HLS.js/native-HLS playback path
- Playback sequence protection so an older channel request cannot overwrite a newer selection
- Local channel-list caching
- Lazy HLS.js loading

The playlist itself is maintained outside this ZIP in the public GitHub repository shown above. To change the playlist in the future, normally edit only:

```text
public/data/live-tv.json
```

then deploy the updated project.

### 2.3 Adsterra banner CSP fix — v31 (retained)

The previous v30 screenshot showed Adsterra's `invoke.js` being loaded but its generated inline execution being blocked by the CSP.

The important discovery was that the project has **two CSP layers**:

1. `public/_headers`
2. `functions/_shared/api.js` → `securityHeaders()` → `functions/_middleware.js`

The Functions middleware applies the CSP to responses and therefore could override the CSP that looked correct in `public/_headers`.

v32 keeps the v31 CSP fix and additionally permits the Google Analytics and contact-form domains by `functions/_shared/api.js` so the effective response policy contains:

```text
script-src 'self' 'unsafe-inline' ... https://n6wxm.com https://www.highrevenueformat.com https://5gvci.com
```

This is required for the current third-party ad integration. The rest of the CSP restrictions remain in place.

### 2.4 Ad placements

Banner slots are present in both:

- `public/index.html`
- `public/index_2.html`

Slots:

```text
ad-home-trending
ad-home-top10
ad-browse-filter
ad-live-tv
```

`public/js/ads.js` loads the ad code dynamically.

Desktop banner:

```text
728 x 90
Zone/key: 96d2a0e12b32b033ad053b50f71c7fb2
```

Mobile banner:

```text
468 x 60
Zone/key: cf8e21a2432417e5aab645a08f77365a
```

The Monetag Vignette script configured in this build uses:

```text
https://n6wxm.com/vignette.min.js
Zone: 11960580
```

The loader uses a sequential promise chain for banner slots so multiple global `atOptions` configurations do not race each other.

---


## 2.5 Information pages — v32

The information pages were updated without changing the site's routing or main UI architecture. They remain inside both `public/index.html` and `public/index_2.html`.

Routes:

```text
/about
/contact
/privacy
/terms
/disclaimer
```

The wording is intentionally simple and professional. The pages cover the site's purpose, TMDB usage, third-party services, privacy, advertising/analytics, copyright requests, terms of use and availability.

The primary contact address is:

```text
movimoon.com@gmail.com
```

### Contact form

The Contact page now includes a simple web form using FormSubmit as the form delivery service. The form sends:

- name
- email
- subject
- message

The form endpoint is:

```text
https://formsubmit.co/movimoon.com@gmail.com
```

FormSubmit requires a first-use email confirmation before submissions are delivered. The site returns visitors to `/contact?sent=1` after submission.

If you later replace FormSubmit with another email provider, update the form `action` in both `public/index.html` and `public/index_2.html`, then update the CSP `form-action` permission in both `public/_headers` and `functions/_shared/api.js`.

FormSubmit is an external service, so its own privacy and processing terms also apply.

## 2.6 Google Analytics 4 — v32

Google Analytics has been added using measurement ID:

```text
G-Y9ZE1PE00H
```

The implementation is centralized in:

```text
public/js/analytics.js
```

Both entry documents load it:

```text
public/index.html
public/index_2.html
```

The Google Analytics script is loaded from `www.googletagmanager.com`, and the CSP has been updated in both CSP layers so Analytics can send measurement requests.

Do not add the Google tag again manually to individual pages; this project is a single-page application and the shared analytics loader is the intended location.

## 3. Monetag service-worker file

The Monetag verification/service-worker file is:

```text
public/sw.js
```

After deployment it should be available at:

```text
https://movimoon.pages.dev/sw.js
```

The file supplied for this site contains the Monetag configuration for:

```text
domain: 5gvci.com
zoneId: 11960549
```

Do not rename it. Do not move it under `js/` or another subfolder.

If Monetag dashboard verification was performed against a different hostname, verify the currently used primary hostname separately as required by the Monetag account.

---

## 4. Cloudflare Pages project structure

The project root is:

```text
movimoon/
├── functions/
│   ├── _middleware.js
│   ├── _shared/
│   │   └── api.js
│   └── api/
│       └── [[path]].js
├── public/
│   ├── index.html
│   ├── index_2.html
│   ├── 404.html
│   ├── _headers
│   ├── _redirects
│   ├── _routes.json
│   ├── sw.js
│   ├── assets/
│   ├── css/
│   ├── data/
│   └── js/
├── package.json
├── wrangler.jsonc
└── README.md
```

### Very important

`functions/` must stay at the **project root**. Do not put `functions/` inside `public/`.

`public/data/live-tv.json` must stay under `public/data/`.

`public/sw.js` must stay directly under `public/` so it becomes `/sw.js` on the deployed site.

---

## 5. Cloudflare deployment

### Recommended: GitHub/Cloudflare Pages Git deployment

The repository should have the structure shown above at its root.

Recommended Pages settings for this project:

```text
Framework preset: None / custom
Build command: leave empty if your current Pages setup already deploys the project directly
Build output directory: public
Root directory: /
```

Keep `functions/` at the repository root so Cloudflare Pages Functions can be detected.

### If using Wrangler

The included `wrangler.jsonc` contains:

```json
{
  "name": "movimoon",
  "pages_build_output_dir": "./public",
  "compatibility_date": "2024-11-01",
  "send_metrics": false
}
```

The package file contains the project's existing development/check scripts.

Do not move the `functions/` directory just to make a drag-and-drop folder look simpler. Pages Functions require the correct project/deployment workflow.

---

## 6. Environment variables / secrets

The main project can use these Cloudflare Pages variables:

### Player

```text
PLAYER_EMBED_URL=https://movimoon-com-player.md-ismail.workers.dev/?tmdb={mediaId}&type={mediaType}&s={season}&e={episode}
```

```text
PLAYER_ALLOWED_ORIGINS=https://movimoon-com-player.md-ismail.workers.dev
```

These are for the **movie/TV player Worker**, not for Live TV.

### TMDB

The project supports the existing TMDB configuration through Pages environment/secrets, including the existing project variables such as:

```text
TMDB_API_KEY
TMDB_READ_ACCESS_TOKEN
```

Use the variable already configured for the project. Do not paste private API secrets into public JavaScript.

### Optional comments/Turnstile

The existing API also supports the project's existing Turnstile/comment settings when configured:

```text
TURNSTILE_SITE_KEY
TURNSTILE_SECRET
COMMENTS_ENABLED
```

Do not invent values for these. Only configure them if the corresponding feature is being used.

---

## 7. Main routes

Current clean routes include:

```text
/
/movies
/tv-shows
/trending
/top-rated
/upcoming
/watchlist
/history
/live-tv
/about
/contact
/privacy
/terms
/disclaimer
```

Movie/TV detail routes use clean paths such as:

```text
/movie/{id}-{slug}
/tv/{id}-{slug}
```

The route behavior is controlled by:

```text
public/_redirects
public/_routes.json
public/js/app.js
public/js/app_2.js
```

---

## 8. TMDB/API architecture

The front end uses the site's `/api/tmdb/...` proxy rather than putting the TMDB secret directly into the public page code.

Relevant server files:

```text
functions/_shared/api.js
functions/api/[[path]].js
functions/_middleware.js
```

The middleware also applies security headers to responses.

---

## 9. CSP/security architecture

There are two important locations to remember:

```text
public/_headers
functions/_shared/api.js
```

The second one is especially important because:

```text
functions/_middleware.js
        ↓
securityHeaders()
        ↓
Content-Security-Policy response header
```

If a future update changes advertising or external scripts, changing only `public/_headers` may not be enough. Always inspect `functions/_shared/api.js` as well.

Current external domains intentionally used by the site include the project's existing TMDB, Google Fonts, Google Analytics, CDN, player, Live TV playlist, Monetag, Adsterra and FormSubmit integrations. Do not add random third-party domains without a reason.

---

## 10. Important external integrations

### TMDB

Used for movie/TV metadata, images and discovery.

### Player Worker

```text
https://movimoon-com-player.md-ismail.workers.dev/
```

This is separate from Live TV.

### Live TV playlist

```text
https://raw.githubusercontent.com/ismail47334/movimoon-iptv-playlist/refs/heads/main/movimoon-iptv-playlist.m3u
```

Configured through:

```text
public/data/live-tv.json
```

### Monetag

Service worker:

```text
public/sw.js
```

Vignette loader:

```text
https://n6wxm.com/vignette.min.js
```

### Adsterra

Banner loader:

```text
public/js/ads.js
```

The current implementation dynamically creates the Adsterra `invoke.js` script after assigning `window.atOptions`.

---

## 11. How to change the Live TV playlist later

Edit only:

```text
public/data/live-tv.json
```

Example:

```json
{
  "playlistUrl": "https://example.com/your-public-playlist.m3u"
}
```

Requirements for the playlist URL:

- Must be an HTTPS URL
- Must be publicly reachable by the visitor's browser
- The remote server must permit browser access (CORS) if direct browser fetching is required
- The file must be a valid M3U/M3U8-style playlist with usable `#EXTINF` entries and stream URLs

The site does not use the old Live TV Cloudflare Worker relay.

---

## 12. How to update ads later

Banner code is centralized in:

```text
public/js/ads.js
```

Placement containers are in:

```text
public/index.html
public/index_2.html
```

CSP permissions are controlled in both:

```text
public/_headers
functions/_shared/api.js
```

If an ad provider gives a new script domain, zone, or format, update the appropriate loader and CSP together. Do not paste arbitrary ad scripts into every page.

---

## 13. How to verify after every deployment

Run these browser checks first:

### A. Main site

```text
https://movimoon.pages.dev/
```

### B. Live TV config

```text
https://movimoon.pages.dev/data/live-tv.json
```

Expected result: JSON containing `playlistUrl`.

### C. Monetag service worker

```text
https://movimoon.pages.dev/sw.js
```

Expected result: the Monetag service-worker JavaScript, not a 404 page.

### D. Live TV

```text
https://movimoon.pages.dev/live-tv
```

Expected:

- channel count appears
- channel guide loads
- continent/country/category filters appear
- selecting a channel starts the direct playback attempt

### E. Ads

Check the intended banner locations on:

- Home
- Movies
- TV Shows
- Live TV

Open DevTools Console and check for CSP errors involving:

```text
highrevenueformat.com
n6wxm.com
invoke.js
```

A browser extension's `chrome-extension://...` error is generally unrelated to MoviMoon and should not be treated as a site bug without further evidence.

---

## 14. Current known limitations

1. Third-party ad providers decide whether an actual banner is returned. A correctly configured ad slot can still be empty if the provider does not return an ad, the zone is not active, the browser blocks the request, or the provider is still optimizing the placement.
2. Live TV streams depend on the public playlist and the stream provider. A channel can be listed but still fail to play if its source is offline or incompatible with the browser.
3. The Live TV filter metadata quality depends on the M3U `#EXTINF` metadata.
4. The player Worker is a separate system from the MoviMoon Pages site.
5. Do not expose TMDB or other private API secrets in public files.

---

## 15. Update history

### v32 — Information pages + contact form + Google Analytics

- Replaced the temporary demo information pages with concise professional About, Contact, Privacy, Terms and Disclaimer content.
- Added the `movimoon.com@gmail.com` contact address.
- Added a simple Contact form using FormSubmit.
- Added Google Analytics 4 with measurement ID `G-Y9ZE1PE00H`.
- Added Google Analytics and FormSubmit domains to both CSP layers.
- Kept the v31 Live TV, advertising, Monetag and CSP fixes unchanged.
- Updated this README for the v32 configuration and deployment steps.

### v31 — Ad CSP root fix + documentation

- Fixed the effective CSP generated by `functions/_shared/api.js`.
- Added the inline-script permission required by the current Adsterra banner integration.
- Kept Monetag/Adsterra external domains in the CSP.
- Retained the v30 Live TV `this`-context fix and config fallback.
- Updated Live TV and ad cache-busting query versions from `v30` to `v31`.
- Added this comprehensive `README.md`.

### v30 — Live TV config fix + ad CSP attempt

- Fixed the Live TV async `this`-context bug.
- Added Live TV config fallback.
- Added cache-busting to Live TV config.
- Added/retained Monetag `public/sw.js`.
- Added the advertising CSP changes that were later found to be incomplete because the Functions middleware also generated CSP.

### v29 — Monetag service worker + ads

- Added Monetag `public/sw.js`.
- Added the centralized ad loader and page-specific banner placements.
- Retained direct Live TV playlist architecture.

---

## 16. Rule for future MoviMoon updates

Every future update should:

1. Start from the latest confirmed working ZIP.
2. Make only the requested changes unless a dependency requires another change.
3. Update this README with the new version and configuration changes.
4. Keep `functions/` at the project root.
5. Keep `public/sw.js` at the public root.
6. Keep Live TV configuration in `public/data/live-tv.json`.
7. Check all CSP sources in both `public/_headers` and `functions/_shared/api.js`.
8. Run JavaScript syntax checks.
9. Search for obsolete Worker URLs or stale version references.
10. Verify ZIP integrity and the final file structure before delivering the ZIP.

This README is intended to be the first document to read when the ZIP is moved to another machine, repository, or deployment environment.

