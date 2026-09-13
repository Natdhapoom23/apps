import { cp, mkdir, rm } from 'node:fs/promises';
// Only publish this explicit allowlist; never publish lib/, tests/, .env or database files.
await rm('dist',{recursive:true,force:true});await mkdir('dist/assets',{recursive:true});
for(const path of ['index.html','styles.css','app.js','activities.js','assets','games'])await cp(path,`dist/${path}`,{recursive:true});
console.log('Built public site in dist/');
