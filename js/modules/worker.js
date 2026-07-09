// Web Worker for processing images and PDFs off the main thread
self.importScripts("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js");
self.importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
self.importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Basic error logging wrapper
function reportError(id, msg) {
    self.postMessage({ type: 'error', id, message: msg });
}

self.onmessage = async function(e) {
    const data = e.data;
    const { id, type, filesInfo, settingsList, outName, outFormat } = data;

    try {
        const zip = new JSZip();
        let totalOutputCount = 0;
        let singleResultBlob = null;
        let singleResultExt = null;

        for (let i = 0; i < filesInfo.length; i++) {
            const fileInfo = filesInfo[i];
            self.postMessage({ type: 'progress', id, message: `正在處理 (${i + 1}/${filesInfo.length}): ${fileInfo.name}` });

            const file = fileInfo.file; // File object passed directly
            const p = settingsList[i];

            if (file.type === "application/pdf") {
                if (outFormat === "png" || outFormat === "jpg") {
                  const mime = outFormat === "jpg" ? "image/jpeg" : "image/png";
                  const blobs = await processPdfToImages(file, p, mime);
                  blobs.forEach((blob, index) => {
                    const nameParts = file.name.split(".");
                    nameParts.pop();
                    const pageNum = (index + 1).toString().padStart(2, "0");
                    zip.file(
                      `${nameParts.join(".")}_page_${pageNum}.${outFormat}`,
                      blob
                    );
                  });
                  totalOutputCount += blobs.length;
                } else {
                  const blob = await processPDF(file, p);
                  const nameParts = file.name.split(".");
                  nameParts.pop();
                  zip.file(`${nameParts.join(".")}_wm.pdf`, blob);
                  if (filesInfo.length === 1) {
                    singleResultBlob = blob;
                    singleResultExt = "pdf";
                  }
                  totalOutputCount++;
                }
            } else {
                let ext, blob;
                if (outFormat === "pdf") {
                  const imgBlob = await processImage(file, p, "image/jpeg");
                  blob = await createPdfFromImage(imgBlob);
                  ext = "pdf";
                } else {
                  let mimeType = file.type;
                  if (outFormat === "jpg") mimeType = "image/jpeg";
                  if (outFormat === "png") mimeType = "image/png";
                  blob = await processImage(file, p, mimeType);
                  if (outFormat !== "auto") ext = outFormat;
                  else ext = file.type.split("/")[1];
                  if (ext === "jpeg") ext = "jpg";
                }
                const nameParts = file.name.split(".");
                nameParts.pop();
                zip.file(`${nameParts.join(".")}_wm.${ext}`, blob);
                if (filesInfo.length === 1) {
                  singleResultBlob = blob;
                  singleResultExt = ext;
                }
                totalOutputCount++;
            }
        }

        if (filesInfo.length === 1 && totalOutputCount === 1) {
            self.postMessage({ type: 'done', id, result: singleResultBlob, ext: singleResultExt });
        } else {
            self.postMessage({ type: 'progress', id, message: "打包壓縮中..." });
            const content = await zip.generateAsync({ type: "blob" });
            self.postMessage({ type: 'done', id, result: content, ext: "zip" });
        }

    } catch (err) {
        reportError(id, err.message);
    }
};

// Canvas drawing shared logic
function applyWatermarkToCanvas(targetCtx, width, height, p) {
  const basePx = width / 20;
  const fontSize = basePx * (p.size / 50);

  targetCtx.save();
  if (p.mask && p.usageMode === 'idcard') {
    targetCtx.beginPath();
    targetCtx.rect(0, 0, width, height);
    const mx = p.mask.x * width;
    const my = p.mask.y * height;
    const mw = p.mask.w * width;
    const mh = p.mask.h * height;
    targetCtx.rect(mx, my, mw, mh);
    targetCtx.clip("evenodd");
  }

  targetCtx.font = `bold ${fontSize}px "${p.font}"`;
  targetCtx.fillStyle = p.color;
  targetCtx.globalAlpha = p.opacity;
  targetCtx.textBaseline = "middle";
  targetCtx.textAlign = "center";

  if (p.usageMode === "general" && p.currentMode === "single") {
    let x, y, bw, bh;
    if (p.textBoxRect) {
      x = p.textBoxRect.x * width;
      y = p.textBoxRect.y * height;
      bw = p.textBoxRect.w * width;
      bh = p.textBoxRect.h * height;
    } else {
      x = width * 0.3;
      y = height * 0.3;
      bw = 200;
      bh = 60;
    }

    targetCtx.translate(x + bw/2, y + bh/2);
    targetCtx.rotate((p.rotate * Math.PI) / 180);
    drawWrappedText(targetCtx, p.text, 0, 0, bw, bh, fontSize, p.isVertical);
  } else if (p.currentMode === "single") {
    const textW = targetCtx.measureText(p.text).width;
    let x, y;
    if (p.currentPos === "custom") {
        x = width / 2;
        y = height / 2;
    } else {
        const [v, h] = p.currentPos.split("-");
        const margin = fontSize;
        if (h === "left") x = margin + textW / 2;
        else if (h === "right") x = width - margin - textW / 2;
        else x = width / 2;
        if (v === "top") y = margin + fontSize / 2;
        else if (v === "bottom") y = height - margin - fontSize / 2;
        else y = height / 2;
    }
    targetCtx.translate(x, y);
    targetCtx.rotate((p.rotate * Math.PI) / 180);
    drawWrappedText(targetCtx, p.text, 0, 0, width, height, fontSize, false);
  } else {
    const gapPx = (p.gap / 100) * fontSize * 4;
    const cols = Math.ceil(width / gapPx) + 2;
    const rows = Math.ceil(height / gapPx) + 2;
    for (let i = -1; i < cols; i++) {
      for (let j = -1; j < rows; j++) {
        const x = i * gapPx;
        let y = j * gapPx;
        let xOffset = (j % 2 !== 0) ? gapPx / 2 : 0;
        targetCtx.save();
        targetCtx.translate(x + xOffset, y);
        targetCtx.rotate((p.rotate * Math.PI) / 180);
        targetCtx.fillText(p.text, 0, 0);
        targetCtx.restore();
      }
    }
  }
  targetCtx.restore();
  targetCtx.globalAlpha = 1.0;
}

function drawWrappedText(ctx, text, cx, cy, maxWidth, maxHeight, fontSize, isVertical) {
    const lines = text.split('\n');
    if (isVertical) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let totalWidth = lines.length * fontSize;
        let startX = cx + (totalWidth / 2) - (fontSize / 2);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let chars = line.split('');
            let startY = cy - (chars.length * fontSize) / 2 + (fontSize / 2);
            for(let j = 0; j < chars.length; j++) {
                ctx.fillText(chars[j], startX - (i * fontSize), startY + (j * fontSize));
            }
        }
    } else {
        let wrappedLines = [];
        for (let i = 0; i < lines.length; i++) {
            let words = lines[i].split('');
            let currentLine = '';
            for(let n = 0; n < words.length; n++) {
                let testLine = currentLine + words[n];
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    wrappedLines.push(currentLine);
                    currentLine = words[n];
                } else {
                    currentLine = testLine;
                }
            }
            wrappedLines.push(currentLine);
        }
        let lineHeight = fontSize * 1.2;
        let totalHeight = wrappedLines.length * lineHeight;
        let startY = cy - totalHeight / 2 + (lineHeight / 2);
        for(let i=0; i<wrappedLines.length; i++) {
            ctx.fillText(wrappedLines[i], cx, startY + (i * lineHeight));
        }
    }
}

async function processPdfToImages(file, p, mimeType) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const outputBlobs = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    applyWatermarkToCanvas(context, canvas.width, canvas.height, p);
    const blob = await canvas.convertToBlob({ type: mimeType, quality: 0.9 });
    outputBlobs.push(blob);
  }
  return outputBlobs;
}

async function createPdfFromImage(imgBlob) {
  const pdfDoc = await PDFLib.PDFDocument.create();
  const imgBytes = await imgBlob.arrayBuffer();
  let imgEmbed;
  if (imgBlob.type === "image/png") imgEmbed = await pdfDoc.embedPng(imgBytes);
  else imgEmbed = await pdfDoc.embedJpg(imgBytes);
  const page = pdfDoc.addPage([imgEmbed.width, imgEmbed.height]);
  page.drawImage(imgEmbed, {
    x: 0, y: 0, width: imgEmbed.width, height: imgEmbed.height,
  });
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

async function processImage(file, p, mimeType) {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  applyWatermarkToCanvas(ctx, canvas.width, canvas.height, p);
  return await canvas.convertToBlob({ type: mimeType, quality: 0.9 });
}

async function processPDF(file, p) {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    applyWatermarkToCanvas(ctx, width, height, p);
    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    const pngImageBytes = await pngBlob.arrayBuffer();
    const embeddedImage = await pdfDoc.embedPng(pngImageBytes);
    page.drawImage(embeddedImage, { x: 0, y: 0, width: width, height: height });
  }
  const saved = await pdfDoc.save();
  return new Blob([saved], { type: "application/pdf" });
}
