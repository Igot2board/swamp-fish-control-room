import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['index.html','styles.css','app.js','model.js','reader.js','storage.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
const hash=createHash('sha256');for(const f of files){hash.update(f);hash.update(await readFile(f));}
const sw=await readFile('sw.js','utf8');hash.update(sw.replace(/const BUILD='[^']+';/,"const BUILD='pending';"));const build=hash.digest('hex').slice(0,16);
await writeFile('version.json',JSON.stringify({build},null,2)+'\n');await writeFile('sw.js',sw.replace(/const BUILD='[^']+';/,`const BUILD='${build}';`));console.log('Prepared release',build);
