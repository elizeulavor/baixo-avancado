// Servidor local do app (sem dependências). No computador, http://localhost libera o microfone.
// No celular o microfone exige HTTPS: para usar no celular, publique o app (ver README).
// Uso: node scripts/servidor.mjs [porta]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const porta = Number(process.argv[2] ?? 5173);
const tipos = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ics': 'text/calendar'};

http.createServer((req, res) => {
	const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let arq = path.normalize(path.join(raiz, url));
	if (!arq.startsWith(raiz)) return res.writeHead(403).end();
	if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
	fs.readFile(arq, (e, dados) => {
		if (e) return res.writeHead(404).end('não encontrado');
		res.writeHead(200, {'Content-Type': tipos[path.extname(arq)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache'});
		res.end(dados);
	});
}).listen(porta, () => {
	console.log(`App em http://localhost:${porta}`);
	const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
	for (const ip of ips) console.log(`Na mesma rede: http://${ip}:${porta}  (abre no celular, mas o microfone só funciona com HTTPS)`);
	console.log('Ctrl+C para parar.');
});
