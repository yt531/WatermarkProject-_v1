import { parsePageRange } from './page-range';

describe('parsePageRange', () => {
  it('returns every page for empty input', () => {
    expect(parsePageRange('', 4)).toEqual({ pages: [1, 2, 3, 4] });
    expect(parsePageRange('   ', 2)).toEqual({ pages: [1, 2] });
  });

  it('parses single pages and ranges', () => {
    expect(parsePageRange('1,3,5-7', 10)).toEqual({ pages: [1, 3, 5, 6, 7] });
  });

  it('deduplicates and sorts', () => {
    expect(parsePageRange('5,1-3,2,5', 10)).toEqual({ pages: [1, 2, 3, 5] });
  });

  it('accepts full-width separators and range words', () => {
    expect(parsePageRange('1，3、5－7', 10)).toEqual({ pages: [1, 3, 5, 6, 7] });
    expect(parsePageRange('2 4 6', 10)).toEqual({ pages: [2, 4, 6] });
    expect(parsePageRange('2到4', 10)).toEqual({ pages: [2, 3, 4] });
    expect(parsePageRange('2~3', 10)).toEqual({ pages: [2, 3] });
  });

  it('ignores stray separators', () => {
    expect(parsePageRange(',1,,2,', 5)).toEqual({ pages: [1, 2] });
  });

  it('rejects unrecognised text', () => {
    expect(parsePageRange('abc', 5)).toEqual({ error: expect.stringContaining('abc') });
    expect(parsePageRange('1-2-3', 5)).toEqual({ error: expect.stringContaining('1-2-3') });
  });

  it('rejects reversed ranges', () => {
    expect(parsePageRange('5-2', 10)).toEqual({ error: expect.stringContaining('5-2') });
  });

  it('rejects pages outside the document', () => {
    expect(parsePageRange('0', 5)).toEqual({ error: expect.stringContaining('第 0 頁') });
    expect(parsePageRange('3-9', 5)).toEqual({ error: expect.stringContaining('第 9 頁') });
  });

  it('rejects input that contains only separators', () => {
    expect(parsePageRange(',,', 5)).toHaveProperty('error');
  });
});
