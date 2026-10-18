// Confere cada música do repertório no YouTube (oEmbed): o vídeo existe, permite ser tocado dentro
// do app e o canal é o anotado. Rode antes de publicar mudanças no repertório. Precisa de internet.
// Uso: node scripts/conferir-repertorio.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rep = JSON.parse(fs.readFileSync(path.join(raiz, 'app/programa/repertorio.json'), 'utf8'));
let erros = 0;
for (const m of rep.musicas) {
	const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${m.yt}&format=json`);
	if (!r.ok) {
		erros++;
		console.log(`ERRO   ${m.id}: vídeo ${m.yt} indisponível ou não incorporável (HTTP ${r.status})`);
		continue;
	}
	const j = await r.json();
	const canalOk = j.author_name === m.canal;
	if (!canalOk) erros++;
	console.log(`${canalOk ? 'ok    ' : 'CANAL '} n${m.nivel} ${m.titulo} · ${j.author_name}${canalOk ? '' : ` (anotado: ${m.canal})`}`);
}
const porNivel = rep.niveis.map((n) => rep.musicas.filter((m) => m.nivel === n.n).length);
console.log(`\n${rep.musicas.length} músicas; por nível: ${porNivel.join(' / ')}`);
console.log(erros ? `${erros} problema(s).` : 'Repertório confere.');
process.exit(erros ? 1 : 0);
