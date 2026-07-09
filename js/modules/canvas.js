export function applyWatermarkToCanvas(targetCtx, width, height, p) {
  const basePx = width / 20;
  const fontSize = basePx * (p.size / 50);

  targetCtx.save();

  // Handle mask
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
    // Word-style Text Box
    let x, y, bw, bh;
    if (p.textBoxRect) {
      x = p.textBoxRect.x * width;
      y = p.textBoxRect.y * height;
      bw = p.textBoxRect.w * width;
      bh = p.textBoxRect.h * height;
    } else {
      // default
      x = width * 0.3;
      y = height * 0.3;
      bw = 200;
      bh = 60;
    }

    targetCtx.translate(x + bw/2, y + bh/2);
    targetCtx.rotate((p.rotate * Math.PI) / 180);

    drawWrappedText(targetCtx, p.text, 0, 0, bw, bh, fontSize, p.isVertical);

  } else if (p.currentMode === "single") {
    // Fallback single mode
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
    // Tiled mode
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
        // Vertical text drawing
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
        // Horizontal text wrapping
        let wrappedLines = [];
        for (let i = 0; i < lines.length; i++) {
            let words = lines[i].split(''); // wrap by character for CJK support
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
