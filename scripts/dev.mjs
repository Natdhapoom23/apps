import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
const port=Number(process.env.PORT||4174);
if(process.env.DEMO_MODE==='true'&&!process.env.PUBLIC_URL){const addr=Object.values(networkInterfaces()).flat().find(v=>v.family==='IPv4'&&!v.internal);if(addr)process.env.PUBLIC_URL=`http://${addr.address}:${port}`;}
const {default:handler}=await import('../api/game.js');
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/game'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>512000){res.writeHead(413);res.end();return;}}
      if(raw){try{req.body=JSON.parse(raw);}catch{res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'JSON ไม่ถูกต้อง'}));return;}}
      return handler(req,res);
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    let path=decodeURIComponent(url.pathname);if(path.endsWith('/'))path+='index.html';
    const file=resolve(root,`.${path}`);
    if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'0.0.0.0',()=>{
  console.log(`Workshop: http://127.0.0.1:${port}/games/live/`);
  if(process.env.DEMO_MODE==='true')console.log(`LOCAL DEMO ONLY · admin password: ${process.env.ADMIN_PASSWORD?'configured in environment':'workshop-demo'} · Mobile: ${process.env.PUBLIC_URL}`);
});
