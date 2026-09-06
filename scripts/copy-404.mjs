// GitHub Pages has no server-side rewrites: a direct request to a client-side
// route like /settings has no matching file and returns a real 404, so
// react-router's BrowserRouter never gets a chance to handle it.
//
// GitHub Pages' documented workaround is to serve a 404.html for any unknown
// path; since our build output is a single-page app, copying the built
// index.html to dist/404.html means unknown paths still load the app shell,
// and BrowserRouter then renders the correct route (or our NotFoundPage) from
// the URL. This must run after `vite build` so it picks up the hashed asset
// filenames from that build.
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const from = path.join(distDir, 'index.html');
const to = path.join(distDir, '404.html');

await copyFile(from, to);
console.log('Copied dist/index.html to dist/404.html for GitHub Pages SPA fallback.');
