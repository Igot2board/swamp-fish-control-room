// Run on locally prepared RGBA fixtures only; household photos are never committed.
// Usage: node scripts/photo-check.mjs /absolute/directory/containing/photos.json
import fs from 'node:fs';import path from 'node:path';import {analyzePixels} from '../reader.js';
const dir=process.argv[2];if(!dir)throw Error('Pass a directory containing photos.json and matching .rgba files.');
for(const p of JSON.parse(fs.readFileSync(path.join(dir,'photos.json')))){const r=analyzePixels({...p,data:new Uint8ClampedArray(fs.readFileSync(path.join(dir,p.name+'.rgba')))});console.log(JSON.stringify({name:p.name,layout:r.layout,samples:r.tubes.filter(t=>t.sample.ok).length,numericValidated:r.numericValidated===true}));}
