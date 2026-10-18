// Gera os ícones do app (PNG 180/192/512 e SVG) a partir de marca/radix-icone.svg, renderizando no
// Edge (ou Chrome) sem interface. Uso: node scripts/icones.mjs
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pasta = path.join(raiz, 'app', 'icones');
fs.mkdirSync(pasta, {recursive: true});
const navegador = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));
if (!navegador) {
	console.log('FALTA Edge ou Chrome para gerar os ícones.');
	process.exit(1);
}
const svg = path.join(raiz, 'marca', 'radix-icone.svg');
const html = path.join(raiz, 'marca', '_icone.html');
fs.writeFileSync(html, `<!doctype html><style>html,body{margin:0;background:#07080a}img{display:block;width:512px;height:512px}</style><img src="${pathToFileURL(svg)}">`);
for (const n of [512, 192, 180]) {
	const dest = path.join(pasta, `icone-${n}.png`);
	spawnSync(navegador, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=512,512', `--force-device-scale-factor=${n / 512}`, '--virtual-time-budget=1500', `--screenshot=${dest}`, pathToFileURL(html).href], {stdio: 'ignore'});
	console.log(fs.existsSync(dest) ? `ok ${path.basename(dest)} (${fs.statSync(dest).size} bytes)` : `FALHOU ${dest}`);
}
fs.rmSync(html, {force: true});
fs.copyFileSync(path.join(raiz, 'marca', 'radix-icone.svg'), path.join(pasta, 'icone.svg'));
console.log('ok icone.svg');
