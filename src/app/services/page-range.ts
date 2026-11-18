export type PageRangeResult = { pages: number[] } | { error: string };

/**
 * 解析頁碼範圍字串，例如 "1,3,5-8"。
 * - 空字串代表全部頁
 * - 接受全形逗號、頓號、空白作為分隔，以及 - － ~ 到 至 作為範圍符號
 * - 結果已去重並由小到大排序
 */
export function parsePageRange(input: string, total: number): PageRangeResult {
  const text = input.trim();
  if (!text) {
    return { pages: Array.from({ length: total }, (_, i) => i + 1) };
  }

  const normalized = text.replace(/[，、；;\s]+/g, ',').replace(/[－–—~～到至]/g, '-');
  const selected = new Set<number>();

  for (const part of normalized.split(',')) {
    if (!part) continue;

    const single = /^\d+$/.exec(part);
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (!single && !range) {
      return { error: `無法辨識「${part}」，請用 1,3,5-8 的格式` };
    }

    const start = Number(single ? single[0] : range![1]);
    const end = Number(single ? single[0] : range![2]);
    if (start > end) {
      return { error: `頁碼範圍 ${start}-${end} 的順序顛倒了` };
    }
    for (const n of [start, end]) {
      if (n < 1 || n > total) {
        return { error: `第 ${n} 頁超出範圍（共 ${total} 頁）` };
      }
    }
    for (let n = start; n <= end; n++) selected.add(n);
  }

  if (selected.size === 0) {
    return { error: '請輸入頁碼，或清空代表全部頁' };
  }
  return { pages: [...selected].sort((a, b) => a - b) };
}
