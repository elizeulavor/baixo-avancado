// Gera dist/ pronto para publicar: copia app/, valida o programa e troca a versão do cache offline
// (assim o celular baixa a versão nova). Também gera dist.zip para arrastar no Netlify Drop.
// Uso: node scripts/empacotar.mjs
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const v = spawnSync(process.execPath, [path.join(raiz, 'scripts', 'validar.mjs')], {encoding: 'utf8'});
if (v.status !== 0) {
	console.log(v.stdout);
	console.log('Programa com erro: nada foi empacotado.');
	process.exit(1);
}
const dist = path.join(raiz, 'dist');
fs.rmSync(dist, {recursive: true, force: true});
// arquivos que começam com _ são de teste (ex.: _moldura.html) e não vão para o app publicado
fs.cpSync(path.join(raiz, 'app'), dist, {recursive: true, filter: (p) => !path.basename(p).startsWith('_')});
const versao = `baixo-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
const sw = path.join(dist, 'sw.js');
// lista completa do que o app usa, para funcionar offline desde a primeira visita
const todos = [];
const andar = (d, rel = '') => {
	for (const n of fs.readdirSync(d)) {
		const p = path.join(d, n);
		const r = rel ? `${rel}/${n}` : n;
		if (fs.statSync(p).isDirectory()) andar(p, r);
		else if (!/\.(md)$/.test(n) && n !== 'sw.js') todos.push(r);
	}
};
andar(dist);
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8')
	.replace(/const VERSAO = '[^']+'/, `const VERSAO = '${versao}'`)
	.replace(/const ARQUIVOS = \[[^\]]*\]; \/\/ @lista/, `const ARQUIVOS = ${JSON.stringify(['./', ...todos])};`));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
const zip = path.join(raiz, 'dist.zip');
fs.rmSync(zip, {force: true});
const z = spawnSync('tar', ['-a', '-c', '-f', zip, '-C', dist, '.'], {encoding: 'utf8'});
console.log(`dist/ pronto (cache ${versao}).`);
console.log(z.status === 0 ? `dist.zip pronto (${(fs.statSync(zip).size / 1024).toFixed(0)} KB).` : 'Não gerei o zip (tar indisponível); publique a pasta dist/.');
