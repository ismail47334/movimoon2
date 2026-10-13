# MoviMoon v38 Blog Automation

## Posting model
The original Blogger Apps Script remains the only content-posting engine. No second TMDB movie/TV posting engine is included.

## GitHub mirror
The Apps Script mirrors Blogger posts to GitHub repository `ismail47334/movimoon2`, which Cloudflare Pages deploys.

### Script Properties
- `TMDB_API_KEY` = your existing TMDB API key
- `MOVIMOON_GITHUB_TOKEN` = your GitHub fine-grained token

### First-time setup
1. Run `testGitHubConnection()` and confirm `GitHub connection OK`.
2. Run `syncAllBloggerPostsToMoviMoon()` once to import existing Blogger posts.
3. If v36 duplicate triggers were previously created, run `removeOldMoviMoonV166Triggers()` once.
4. Do not run any V166 movie/TV posting functions; they are intentionally removed.

### Future posts
When the original `createBloggerPostMovie()` or `createBloggerPostTV()` successfully creates a Blogger post, v38 automatically mirrors that same post to the Cloudflare Blog. It does not create another Blogger post.
