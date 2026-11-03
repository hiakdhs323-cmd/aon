# AonWiki

AonWiki serves complete article HTML documents from Cloudflare Workers. The Worker loads the shared HTML shell, reads the requested article from D1, parses and sanitizes the markup on the server, and returns a complete HTML document for direct `/w/<encoded-title>` requests. GitHub Pages remains the static asset origin; D1 stores article text and revision metadata.

## Architecture

- **Frontend:** HTML, CSS, JavaScript in this repository; deployed with GitHub Actions to GitHub Pages.
- **API:** Cloudflare Worker in `worker/src/index.js`.
- **Database:** Cloudflare D1. Article content and revision metadata are stored in D1.
- **Images:** Cloudflare R2. The Worker validates uploads and serves stored images.
- **Editor access:** one administrator token stored as a Cloudflare Worker secret. Readers can browse; only token holders can save pages or upload images.

This is an independent wiki implementation. Its production NamuMark engine runs in the Cloudflare Worker; the browser-side beta engine switch is no longer part of the user interface.

## Deploy the GitHub Pages frontend

1. Open this repository's **Settings → Pages**.
2. Set the build/deployment source to **GitHub Actions**.
3. Pushes to `main` run `.github/workflows/pages.yml`.
4. The site URL should be `https://hiakdhs323-cmd.github.io/aon/` after the workflow succeeds.

## Set up the Cloudflare API

Requirements: Node.js LTS and Wrangler CLI.

```bash
npm install -g wrangler
wrangler login
wrangler d1 create aonwiki
wrangler r2 bucket create aonwiki-images
```

Copy the D1 database ID printed by the first command into `wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`. Then initialize the database and set an administrator token:

```bash
wrangler d1 execute aonwiki --remote --file=worker/schema.sql
wrangler secret put ADMIN_TOKEN
wrangler deploy
```

Use a long, random token. Do not put it in source files, commit it to GitHub, or share it publicly. The token is an administrator credential.

After deployment, open the site, choose **설정**, and enter the Worker URL (usually `https://aonwiki-api.<your-account>.workers.dev`) and the token. The token is kept in the current browser session only.

## Current starter features

- Article list/search and article reading
- Article creation/editing and revision history
- Wiki-style links: `[[문서 제목]]` or `[[문서 제목|표시 문구]]`
- Section headings: `== 문단 제목 ==`
- Image uploads for PNG, JPEG, GIF, and WebP, up to 5 MiB per file
- Image storage in R2; article text and revision metadata in D1
- Responsive layout for desktop and mobile

## Security and limits

- Public visitors can read articles. Only the administrator token can write articles or upload images.
- This starter does **not** yet provide individual member accounts, per-user permissions, moderation queues, or a complete NamuMark implementation.
- The Worker checks file type and size, but file extensions alone are not a guarantee that an uploaded file is safe. Only upload images you have permission to publish.
- Cloudflare free plans have storage, request, and runtime limits; they are not unlimited. Check the current Cloudflare dashboard for actual quotas.
- Configure `ALLOWED_ORIGIN` in `wrangler.toml` to match the exact origin of your GitHub Pages site if you move the repository to another owner/name.


## Full-document rendering deployment

The Worker must receive the site hostname requests, not only API requests. In Cloudflare, attach the hostname used by the wiki (for example, `aon69446.p-e.kr`) to this Worker as a Custom Domain or route the hostname's traffic to the Worker. Keep the GitHub Pages URL as the asset origin. Set the Worker variable `FRONTEND_ORIGIN` to `https://hiakdhs323-cmd.github.io/aon` if the default differs.

Direct article URLs use `/w/<URL-encoded-title>`. The Worker returns the complete HTML document, including the page shell, article title, metadata, and parsed article body. The old JSON `/api/render` endpoint remains for editor previews and API compatibility; it is not the article page delivery path.
