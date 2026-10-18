// Cópia de segurança completa do projeto, fora da pasta do projeto e dentro do OneDrive:
//  - radix-<data>.bundle: o repositório git inteiro, com todo o histórico (restaura com git clone)
//  - radix-<data>-dados.zip: o que não vai para o GitHub (entrada/ com os backups do progresso,
//    relatorios/, sons-fonte/)
// Guarda as 20 mais recentes. Uso: node scripts/backup.mjs [pasta-destino]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = process.argv[2] ?? path.join(raiz, '..', 'Baixo-Avancado-backups');
fs.mkdirSync(destino, {recursive: true});
const git = ['git', 'C:\\Program Files\\Git\\cmd\\git.exe'].find((g) => spawnSync(g, ['--version']).status === 0);
if (!git) {
	console.log('Git não encontrado. Instale com: winget install Git.Git');
	process.exit(1);
}
const rodar = (cmd, args, op = {}) => {
	const r = spawnSync(cmd, args, {cwd: raiz, encoding: 'utf8', ...op});
	if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr || r.stdout}`);
	return r.stdout.trim();
};
const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
const pendentes = rodar(git, ['status', '--porcelain']);
if (pendentes) console.log(`Aviso: há mudanças sem commit (${pendentes.split('\n').length} arquivos). O bundle leva só o que está commitado; o zip abaixo leva a pasta como está.`);
const bundle = path.join(destino, `radix-${carimbo}.bundle`);
rodar(git, ['bundle', 'create', bundle, '--all']);
rodar(git, ['bundle', 'verify', bundle]);
// dados fora do git (e uma cópia da árvore de trabalho, se houver mudança sem commit)
const zip = path.join(destino, `radix-${carimbo}-dados.zip`);
const itens = ['entrada', 'relatorios', 'sons-fonte'].filter((d) => fs.existsSync(path.join(raiz, d)));
if (pendentes) itens.push('app', 'scripts', 'metodo', 'CLAUDE.md');
if (itens.length) {
	const lista = itens.map((i) => `'${path.join(raiz, i).replace(/'/g, "''")}'`).join(',');
	rodar('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path ${lista} -DestinationPath '${zip.replace(/'/g, "''")}' -Force`]);
}
// mantém os 20 mais recentes de cada tipo
for (const tipo of [/\.bundle$/, /-dados\.zip$/]) {
	const arqs = fs.readdirSync(destino).filter((f) => tipo.test(f)).sort();
	for (const f of arqs.slice(0, Math.max(0, arqs.length - 20))) fs.rmSync(path.join(destino, f));
}
const commit = rodar(git, ['log', '-1', '--format=%h %s']);
console.log(`Backup feito em ${destino}\n  ${path.basename(bundle)} (último commit: ${commit})${itens.length ? `\n  ${path.basename(zip)} (${itens.join(', ')})` : ''}`);
console.log('Para restaurar num computador novo: git clone <arquivo.bundle> Baixo-Avancado');
