import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'audio/manifest.json'),'utf8'));
const files=fs.readdirSync(path.join(root,'assets'));
for(const clip of manifest.files){const relative=clip.src.replace(/^\//,'');assert(fs.statSync(path.join(root,relative)).size>1000,`Missing/empty ${relative}`);assert(sw.includes(relative),`Not precached: ${relative}`);}
for(const fragment of ['solver.worker-','three-'])assert(files.some(f=>f.startsWith(fragment)&&sw.includes(`assets/${f}`)),`Missing precached ${fragment}`);
assert(sw.includes('index.html'));assert(sw.includes('manifest.webmanifest'));assert(sw.includes('woff2'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g))assert(fs.existsSync(path.join(root,match[1].slice(1))),`Broken ${match[1]}`);
console.log(`Verified ${manifest.files.length} bundled Romanian clips, worker, Three renderer, fonts, manifest and HTML assets. This is a bundle check, not a browser offline test.`);
