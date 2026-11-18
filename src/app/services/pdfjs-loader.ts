let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

/** 只在需要處理 PDF 時才載入 pdf.js，避免拖慢首次載入 */
export function loadPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    return lib;
  });
  return pdfjsPromise;
}
