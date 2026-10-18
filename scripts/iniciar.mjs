// Prepara o curso neste computador: confere o Node, gera os ícones, valida o programa, testa a
// avaliação e sobe o app em http://localhost:5173. Pode rodar quantas vezes quiser.
// Uso: node scripts/iniciar.mjs [--sem-servidor]
import {spawnSync, spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const rodar = (script) => spawnSync(node, [path.join(raiz, 'scripts', script)], {cwd: raiz, encoding: 'utf8'});
const ok = [];
const falta = [];
const passo = (n) => console.log(`\n== ${n}`);

passo('1/5 Node');
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
	console.log(`Node ${process.versions.node} é antigo. Instale o Node 18 ou mais novo em https://nodejs.org e rode de novo.`);
	process.exit(1);
}
ok.push(`Node ${process.versions.node} (nenhuma dependência para instalar)`);

passo('2/5 Ícones');
if (fs.existsSync(path.join(raiz, 'app', 'icones', 'icone-512.png'))) ok.push('ícones já existem');
else {
	const r = rodar('icones.mjs');
	if (r.status === 0) ok.push('ícones gerados');
	else falta.push(`ícones não gerados: ${r.stderr.trim().split('\n').at(-1)}`);
}

passo('3/5 Programa');
const v = rodar('validar.mjs');
console.log(v.stdout.trim().split('\n').slice(0, 1).join('\n'));
if (v.status === 0) ok.push('programa válido');
else falta.push(`programa com erro:\n${v.stdout.split('\n').filter((l) => l.startsWith('ERRO')).join('\n')}`);

passo('4/5 Avaliação (baixo sintético com erros conhecidos)');
const t = rodar('testar-avaliacao.mjs');
const falhas = t.stdout.split('\n').filter((l) => l.startsWith('FALHA'));
if (t.status === 0 && !falhas.length) ok.push('avaliação acha os erros plantados');
else falta.push(`teste da avaliação falhou:\n${falhas.join('\n') || t.stderr}`);

for (const p of ['entrada', 'relatorios']) fs.mkdirSync(path.join(raiz, p), {recursive: true});

passo('5/5 Resultado');
for (const o of ok) console.log(`ok     ${o}`);
for (const f of falta) console.log(`FALTA  ${f}`);
if (falta.length) process.exit(1);
console.log(`\nTUDO PRONTO.
- No computador: http://localhost:5173 (microfone liberado em localhost).
- No celular: o microfone exige HTTPS. Publique com /publicar (ou veja o README) e instale pela tela inicial.`);

if (!process.argv.includes('--sem-servidor')) {
	console.log('\nSubindo o app... (Ctrl+C para parar)');
	spawn(node, [path.join(raiz, 'scripts', 'servidor.mjs')], {cwd: raiz, stdio: 'inherit'});
}
