import { readFile, writeFile } from 'node:fs/promises';
import { applyMaterialPlan, renderSite } from './engine.mjs';

const [source, destination] = process.argv.slice(2);
try {
  if (!source || !destination) throw new Error('使い方: node .studio/recover.mjs 原稿.json 新規出力.html');
  const record = JSON.parse(await readFile(source, 'utf8'));
  const html = renderSite(applyMaterialPlan(record.site, record.material), record.siteName);
  await writeFile(destination, html, { flag: 'wx', mode: 0o600 });
  console.log('検査済みHTMLを保存しました。', destination);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
