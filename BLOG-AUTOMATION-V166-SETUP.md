# MoviMoon v36 — Blog + 3-Time Automation

## Website
This folder is based on MoviMoon v35. Existing main-site functionality is preserved. v36 adds:
- Footer Blog column
- `/blog`
- `/blog/movie-posts`
- `/blog/tv-series-posts`
- `public/data/blog-posts.json`
- `public/sitemap-blog.xml`
- Blog sitemap entry in robots.txt

## Apps Script workflow
The supplied `apps-script/Code.gs` keeps the existing TMDB mixed-content selection/content generation and changes the publishing destination to GitHub.

Schedule:
- 00:00 Asia/Dhaka — `runMidnightTrendingPosts`
- 06:00 Asia/Dhaka — `runMorningNewReleasePosts`
- 12:00 Asia/Dhaka — `runNoonPreviousPostUpdates`

Run `setupMoviMoonTriggers()` once after installing the new Code.gs. It removes old triggers in the project and creates these three daily triggers.

## GitHub Script Properties
Do NOT paste a GitHub token into Code.gs.

Apps Script → Project Settings → Script properties:

- `MOVIMOON_GITHUB_TOKEN` = your GitHub token
- `MOVIMOON_GITHUB_OWNER` = `ismail47334` (optional; default is already set)
- `MOVIMOON_GITHUB_REPO` = `movimoon2` (optional)
- `MOVIMOON_GITHUB_BRANCH` = `main` (optional)

The token must be able to read/write repository contents.

## First test order
1. Add the Script Property token.
2. Run `testGitHubConnection()`.
3. Run `setupMoviMoonTriggers()`.
4. Manually run `testSingleMoviePost()` once.
5. Manually run `testSingleTVPost()` once.
6. Confirm the generated GitHub files under `public/blog/` and `public/data/blog-posts.json`.
7. Let Cloudflare Pages deploy the commit.
8. Open the generated Blog URL and confirm Watch Now points to the matching MoviMoon `/movie/{id}-{slug}` or `/tv/{id}-{slug}` URL.

## Stable update behavior
A blog post is keyed by `type + TMDB ID`. Once published, its blog slug is stored in `blog-posts.json` and is reused during future updates. Rating, overview, poster/backdrop and other tracked TMDB metadata can be refreshed without changing the Blog URL.

## Important
The Apps Script source still contains the existing TMDB API key from the supplied V165 source. For better security, move that key to a Script Property later; do not publish the key in a public repository.
