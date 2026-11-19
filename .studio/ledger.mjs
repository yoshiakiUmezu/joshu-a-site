import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const integer = value => Number.isSafeInteger(value) && value >= 0;

export function openLedger(file, limits) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  let entries;
  try {
    entries = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('使用記録を読み込めません。');
    entries = [];
  }
  // Never initialize a fresh allowance from unreadable or incomplete records.
  if (!Array.isArray(entries) || !entries.every(row => {
    if (!row || !integer(row.budget) || row.budget === 0) return false;
    if (!['pending', 'failed', 'ok'].includes(row.status)) return false;
    const u = row.usage;
    if (u === null) return row.status !== 'ok';
    return u && [u.inputTokens, u.cachedInputTokens, u.outputTokens, u.totalTokens].every(integer)
      && u.cachedInputTokens <= u.inputTokens && u.inputTokens + u.outputTokens === u.totalTokens;
  })) throw new Error('使用記録の内容が不正です。');

  let writable = true;
  function persist(next) {
    try {
      writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600, flush: true });
      renameSync(file + '.tmp', file);
      entries = next;
    } catch {
      writable = false;
      throw new Error('使用記録に書き込めません。');
    }
  }

  function summary() {
    const totals = { calls: entries.length, inputTokens: 0, cachedInputTokens: 0,
      outputTokens: 0, totalTokens: 0, reservedTokens: 0 };
    for (const { usage, budget } of entries) {
      if (!usage) {
        totals.reservedTokens += budget;
        continue;
      }
      for (const key of Object.keys(usage)) totals[key] += usage[key];
    }
    return totals;
  }

  return {
    summary,
    reserve(action, budget) {
      if (!writable) throw new Error('使用記録への書き込みが停止しています。');
      const s = summary();
      if (s.calls >= limits.maxCalls || s.totalTokens + s.reservedTokens + budget > limits.maxTotalTokens) {
        throw Object.assign(new Error('生成回数またはトークンの残り枠が足りません。'), { status: 429 });
      }
      // Synchronous write before fetch serializes concurrent admissions on the single server.
      const id = entries.length;
      persist([...entries, { at: new Date().toISOString(), action, budget, status: 'pending', usage: null }]);
      return id;
    },
    finish(id, status, usage, htmlBytes) {
      const next = entries.slice();
      next[id] = { ...entries[id], status, usage, htmlBytes };
      persist(next);
    },
  };
}
