import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.join(root,pathname);if(!file.startsWith(root))throw new Error('Invalid path');let stat;try{stat=await fs.stat(file);}catch{}if(stat?.isDirectory())file=path.join(file,'index.html');else if(!stat&&!path.extname(file))file=path.join(file,'index.html');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('404 Not Found');}});
server.listen(4321,'0.0.0.0',()=>console.log(`TSS preview: http://localhost:4321 (root: ${root})`));
