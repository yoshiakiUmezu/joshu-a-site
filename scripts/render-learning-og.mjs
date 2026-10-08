import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const topics = {
  probability: { label: '算数 / 確率', title: 'サイコロの「出やすさ」を考えよう', description: '理論上の確率と、試行で変わる結果を見比べる。', visual: '<rect x="700" y="165" width="260" height="260" rx="44" fill="#162943" stroke="#7dd3fc" stroke-width="6"/><g fill="#fbbf24"><circle cx="765" cy="230" r="22"/><circle cx="895" cy="230" r="22"/><circle cx="830" cy="295" r="22"/><circle cx="765" cy="360" r="22"/><circle cx="895" cy="360" r="22"/></g><path d="M1010 230h85M1010 295h120M1010 360h70" stroke="#38bdf8" stroke-width="12" stroke-linecap="round"/>' }
};

const root = path.resolve(import.meta.dirname, '..');
const candidates = process.platform === 'win32' ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'] : [];
const executablePath = candidates.find(candidate => existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  for (const [slug, topic] of Object.entries(topics)) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:radial-gradient(ellipse at 85% 50%,#18365b 0,#0c1727 42%,#070a10 80%);color:#f4f7fb;font-family:system-ui,'Noto Sans JP',sans-serif}.eyebrow{position:absolute;left:84px;top:82px;color:#89a9d2;font-size:24px;letter-spacing:.12em}.title{position:absolute;left:84px;top:168px;width:560px;font-size:54px;line-height:1.3;font-weight:750;letter-spacing:.02em}.desc{position:absolute;left:86px;top:390px;width:540px;color:#b9c9df;font-size:25px;line-height:1.6}.rule{position:absolute;left:86px;top:520px;width:110px;height:5px;background:#38bdf8;border-radius:5px}.visual{position:absolute;left:0;top:0;width:1200px;height:630px}</style><div class="eyebrow">ASSISTANT A   /   ${topic.label}</div><div class="title">${topic.title}</div><div class="desc">${topic.description}</div><div class="rule"></div><svg class="visual" viewBox="0 0 1200 630" aria-hidden="true">${topic.visual}</svg></html>`);
    const output = path.join(root, 'assets', `og-learning-${slug}.png`);
    await page.screenshot({ path: output, type: 'png' });
    await page.close();
  }
} finally { await browser.close(); }
