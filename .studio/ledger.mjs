import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const integer = value => Number.isSafeInteger(value) && value >= 0;

export function validUsage(usage) {
  if (!usage) return false;
  const { inputTokens, cachedInputTokens, write30mTokens, write12hTokens, outputTokens, totalTokens } = usage;
  if (![inputTokens, cachedInputTokens, outputTokens, totalTokens].every(integer)
      || cachedInputTokens > inputTokens || inputTokens + outputTokens !== totalTokens) return false;
  // Older records retain their measured totals but cannot establish cache-write cost.
  if (write30mTokens === undefined && write12hTokens === undefined) return true;
  return [write30mTokens, write12hTokens].every(integer)
    && cachedInputTokens + write30mTokens + write12hTokens <= inputTokens;
}

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
    return validUsage(u);
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
      write30mTokens: 0, write12hTokens: 0, unknownCacheWriteCalls: 0,
      outputTokens: 0, totalTokens: 0, reservedTokens: 0 };
    for (const { usage, budget } of entries) {
      if (!usage) {
        totals.reservedTokens += budget;
        continue;
      }
      for (const key of ['inputTokens', 'cachedInputTokens', 'outputTokens', 'totalTokens']) totals[key] += usage[key];
      if (usage.write30mTokens === undefined) totals.unknownCacheWriteCalls++;
      else {
        totals.write30mTokens += usage.write30mTokens;
        totals.write12hTokens += usage.write12hTokens;
      }
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
