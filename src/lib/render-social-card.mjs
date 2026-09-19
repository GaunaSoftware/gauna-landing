import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { SOCIAL_CARDS } from '../config/social-cards.mjs';

const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

export function cardSvg(key) {
  const card = SOCIAL_CARDS[key];
  if (!card) throw new Error('Unknown social card');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#ffffff"/>
    <rect width="18" height="630" fill="#12352d"/>
    <path d="M820 630L1200 250V630Z" fill="#f0f5f2"/>
    <g font-family="DejaVu Sans, Arial, sans-serif">
      <text x="70" y="88" font-size="23" font-weight="600" fill="#12352d">GAUNA SOFTWARE</text>
      <text x="70" y="170" font-size="20" letter-spacing="1.2" fill="#26735c">${escape(card.eyebrow)}</text>
      <rect x="70" y="194" width="74" height="6" rx="3" fill="#e9a52a"/>
      ${card.lines.map((line, index) => `<text x="66" y="${285 + index * 76}" font-size="58" font-weight="700" fill="#12352d">${escape(line)}</text>`).join('')}
      <text x="70" y="433" font-size="25" fill="#52656a">${escape(card.subtitle)}</text>
      <path d="M70 490H1130" stroke="#dae5df"/>
      <text x="70" y="548" font-size="22" font-weight="600" fill="#12352d">${escape(card.footer)}</text>
      <text x="70" y="586" font-size="18" fill="#667875">Información práctica para empresas de transporte</text>
    </g>
  </svg>`;
}

export async function renderSocialCard(key, publicDirectory = resolve('public')) {
  // Reuse the actual published TransGest logo. No AI-generated or redrawn logo.
  const logoSource = await readFile(resolve(publicDirectory, 'logo-transgest.png'));
  const logo = await sharp(logoSource).trim({ threshold: 12 }).resize({ width: 285, height: 76, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  return sharp(Buffer.from(cardSvg(key)))
    .composite([{ input: logo.data, left: 1130 - logo.info.width, top: 65 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
