import http from 'node:http';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const allowed = new Set(['EBOOK.html','EBOOK/ebook.html','EBOOK/ebook.css','EBOOK/flash.css','EBOOK/integrations.css','EBOOK/ebook-data.js','EBOOK/flash.js','EBOOK/integrations.js','EBOOK/app.js','ta/renewal.html','ta/basic.html']);
const types={html:'text/html',css:'text/css',js:'text/javascript'};
const port=Number(process.env.EBOOK_PREVIEW_PORT)||4175;
http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=pathname==='/'?'EBOOK.html':pathname.slice(1);
  if(!allowed.has(name)){res.writeHead(404).end('Not found');return;}
  try{const file=await readFile(new URL(name,root));res.writeHead(200,{'Content-Type':`${types[name.split('.').pop()]}; charset=utf-8`,'Cache-Control':'no-store'});res.end(file);}catch(_){res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`EBOOK preview: http://127.0.0.1:${port}/EBOOK.html`));
