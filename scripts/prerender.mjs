// Post-build SEO/prerender step for GitHub Pages.
//
// GitHub Pages has no server-side rewrites: a direct request to a client-side
// route like /settings has no matching file, so Pages serves 404.html with an
// HTTP 404 status. Because 404.html used to be a byte-for-byte copy of
// index.html, *every* unknown path and the real /settings route returned the
// exact same HTML as the home page, which Google reports as
// "Duplicate without user-selected canonical".
//
// This script fixes that by emitting, from the built index.html:
//
//   dist/settings/index.html  a real 200 page for the /settings route, with
//                             its own title, description and self-referencing
//                             canonical.
//   dist/404.html             the SPA fallback for genuinely unknown paths,
//                             with `robots: noindex` and NO canonical, so
//                             unknown paths are never treated as duplicates.
//
// It must run after `vite build` so it picks up the hashed asset filenames.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_ORIGIN = 'https://holdem-timer.com';

const distDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const indexPath = path.join(distDir, 'index.html');

/** Replaces the first match of `pattern`, failing loudly if it is missing —
 * otherwise a refactor of index.html would silently produce pages without a
 * canonical again. */
function replaceOrThrow(html, pattern, replacement, what) {
  if (!pattern.test(html)) {
    throw new Error(`prerender: could not find ${what} in dist/index.html. Did index.html change?`);
  }

  return html.replace(pattern, replacement);
}

const TITLE = /<title>[\s\S]*?<\/title>/;
const DESCRIPTION = /<meta\s+name="description"[\s\S]*?\/>/;
const CANONICAL = /\s*<link rel="canonical"[^>]*>/;
const OG_TITLE = /<meta property="og:title"[^>]*>/;
const OG_DESCRIPTION = /<meta\s+property="og:description"[\s\S]*?\/>/;
const OG_URL = /<meta property="og:url"[^>]*>/;
const TWITTER_TITLE = /<meta name="twitter:title"[^>]*>/;
const TWITTER_DESCRIPTION = /<meta\s+name="twitter:description"[\s\S]*?\/>/;
const JSON_LD = /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/;
const PLACEHOLDER = /<!-- seo-placeholder:start -->[\s\S]*?<!-- seo-placeholder:end -->/;

/** Applies the shared title/description/OG/Twitter rewrites for a route. */
function withMetadata(html, { title, description }) {
  const escaped = title.replace(/&/g, '&amp;');

  let result = replaceOrThrow(html, TITLE, `<title>${escaped}</title>`, '<title>');
  result = replaceOrThrow(result, DESCRIPTION, `<meta name="description" content="${description}" />`, 'description');
  result = replaceOrThrow(result, OG_TITLE, `<meta property="og:title" content="${escaped}" />`, 'og:title');
  result = replaceOrThrow(
    result,
    OG_DESCRIPTION,
    `<meta property="og:description" content="${description}" />`,
    'og:description',
  );
  result = replaceOrThrow(result, TWITTER_TITLE, `<meta name="twitter:title" content="${escaped}" />`, 'twitter:title');
  result = replaceOrThrow(
    result,
    TWITTER_DESCRIPTION,
    `<meta name="twitter:description" content="${description}" />`,
    'twitter:description',
  );

  return result;
}

const index = await readFile(indexPath, 'utf8');

// --- dist/settings/index.html -------------------------------------------
const settingsTitle = 'Blind Structure Settings - Holdem Timer Poker Clock';
const settingsDescription =
  "Create, edit, import and export custom Texas Hold'em blind structures for the Holdem Timer poker clock - set blind level lengths, small blind, big blind and ante.";

let settings = withMetadata(index, { title: settingsTitle, description: settingsDescription });
settings = replaceOrThrow(
  settings,
  CANONICAL,
  `\n    <link rel="canonical" href="${SITE_ORIGIN}/settings" />`,
  'canonical link',
);
settings = replaceOrThrow(
  settings,
  OG_URL,
  `<meta property="og:url" content="${SITE_ORIGIN}/settings" />`,
  'og:url',
);
settings = replaceOrThrow(
  settings,
  PLACEHOLDER,
  `<div data-seo-placeholder>
        <h1>Blind Structure Settings</h1>
        <p>
          Build the blind structure for your Texas Hold'em home game: set how long each blind level runs, the small
          blind, big blind and ante, and add break levels. Holdem Timer saves your structures in the browser, and you
          can import or export them to move them between devices.
        </p>
      </div>`,
  'SEO placeholder block',
);

await mkdir(path.join(distDir, 'settings'), { recursive: true });
await writeFile(path.join(distDir, 'settings', 'index.html'), settings, 'utf8');

// --- dist/404.html --------------------------------------------------------
let notFound = withMetadata(index, {
  title: 'Page not found - Holdem Timer',
  description: "The page you're looking for doesn't exist on Holdem Timer.",
});
// No canonical and no structured data on the SPA fallback: unknown paths must
// not be presented to Google as another copy of the home page.
notFound = replaceOrThrow(
  notFound,
  CANONICAL,
  '\n    <meta name="robots" content="noindex" />',
  'canonical link',
);
notFound = replaceOrThrow(notFound, JSON_LD, '', 'JSON-LD block');
notFound = replaceOrThrow(
  notFound,
  PLACEHOLDER,
  `<div data-seo-placeholder>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist.</p>
      </div>`,
  'SEO placeholder block',
);

await writeFile(path.join(distDir, '404.html'), notFound, 'utf8');

console.log('Prerendered dist/settings/index.html and dist/404.html for GitHub Pages.');
