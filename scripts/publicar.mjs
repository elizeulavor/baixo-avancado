// Publica o app no GitHub Pages: empacota (valida + nova versão do cache) e envia dist/ para o
// branch gh-pages do repositório "origin". Precisa do git e do gh logado.
// Uso: node scripts/publicar.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args, cwd = raiz) => {
	const r = spawnSync('git', args, {cwd, encoding: 'utf8'});
	if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr || r.stdout}`);
	return r.stdout.trim();
};
const e = spawnSync(process.execPath, [path.join(raiz, 'scripts', 'empacotar.mjs')], {encoding: 'utf8', stdio: 'inherit'});
if (e.status !== 0) process.exit(1);

const origem = git(['remote', 'get-url', 'origin']);
const nome = git(['config', 'user.name']);
const email = git(['config', 'user.email']);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'baixo-pages-'));
fs.cpSync(path.join(raiz, 'dist'), tmp, {recursive: true});
git(['init', '-b', 'gh-pages'], tmp);
git(['add', '-A'], tmp);
git(['-c', `user.name=${nome}`, '-c', `user.email=${email}`, 'commit', '-m', `Publica app ${new Date().toISOString()}`], tmp);
git(['push', '--force', origem, 'gh-pages'], tmp);
fs.rmSync(tmp, {recursive: true, force: true});
const m = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(origem);
console.log(`Publicado. Em 1-2 minutos: https://${m[1].toLowerCase()}.github.io/${m[2]}/`);
