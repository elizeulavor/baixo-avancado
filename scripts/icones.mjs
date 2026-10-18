// Gera os ícones do app (PNG 180/192/512 e SVG) sem depender de nada: desenha pixel a pixel e
// grava PNG com o zlib do Node. Desenho: círculo âmbar com as quatro cordas do baixo.
// Uso: node scripts/icones.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'icones');
fs.mkdirSync(pasta, {recursive: true});
const FUNDO = [17, 18, 20], AMBAR = [242, 179, 61], ESCURO = [17, 18, 20];

// cor de um ponto (u, v em 0..1)
function cor(u, v) {
	const dx = u - 0.5, dy = v - 0.5;
	const r = Math.hypot(dx, dy);
	if (r > 0.34) return FUNDO;
	for (let i = 0; i < 4; i++) {
		const x = 0.5 + (i - 1.5) * 0.1; // a corda grave (esquerda) é a mais grossa
		if (Math.abs(u - x) < 0.026 - i * 0.004) return ESCURO;
	}
	return AMBAR;
}

function png(n) {
	const ss = 4;
	const linhas = [];
	for (let y = 0; y < n; y++) {
		const row = Buffer.alloc(1 + n * 3);
		for (let x = 0; x < n; x++) {
			const acc = [0, 0, 0];
			for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
				const c = cor((x + (sx + 0.5) / ss) / n, (y + (sy + 0.5) / ss) / n);
				acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
			}
			for (let k = 0; k < 3; k++) row[1 + x * 3 + k] = Math.round(acc[k] / (ss * ss));
		}
		linhas.push(row);
	}
	const crcTab = Array.from({length: 256}, (_, i) => {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c >>> 0;
	});
	const crc = (b) => {
		let c = 0xffffffff;
		for (const x of b) c = crcTab[(c ^ x) & 0xff] ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	};
	const bloco = (tipo, dados) => {
		const len = Buffer.alloc(4);
		len.writeUInt32BE(dados.length);
		const td = Buffer.concat([Buffer.from(tipo), dados]);
		const c = Buffer.alloc(4);
		c.writeUInt32BE(crc(td));
		return Buffer.concat([len, td, c]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(n, 0);
	ihdr.writeUInt32BE(n, 4);
	ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))]);
}

for (const n of [180, 192, 512]) fs.writeFileSync(path.join(pasta, `icone-${n}.png`), png(n));
const cordas = [0, 1, 2, 3].map((i) => {
	const x = 50 + (i - 1.5) * 10;
	const w = (0.026 - i * 0.004) * 200;
	return `<rect x="${(x - w / 2).toFixed(2)}" y="10" width="${w.toFixed(2)}" height="80" fill="#111214"/>`;
}).join('');
fs.writeFileSync(path.join(pasta, 'icone.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#111214"/><clipPath id="c"><circle cx="50" cy="50" r="34"/></clipPath><circle cx="50" cy="50" r="34" fill="#f2b33d"/><g clip-path="url(#c)">${cordas}</g></svg>\n`);
console.log(`ícones gerados em ${pasta}`);
