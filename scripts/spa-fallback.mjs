// GitHub Pages has no rewrites, so a deep link like /t/maya would 404. Serving the
// app as the 404 page lets the router take over. Netlify and Vercel use their own
// rewrite files (public/_redirects, vercel.json) and ignore this file.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('spa-fallback: dist/404.html written')
