import { state, getCurrentSettings, updateCurrentSettings } from './state.js';
import { applyWatermarkToCanvas } from './canvas.js';
import { applyColorToUI } from './color.js';
import { updateCarouselUI } from './carousel.js';

export function updatePreview() {
  if (!state.isLoaded || !state.previewImgs[state.currentIndex]) return;
  const canvas = document.getElementById("previewCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const previewImg = state.previewImgs[state.currentIndex];

  const maxDisplayW = 800;
  let scale = 1;
  if (previewImg.width > maxDisplayW) scale = maxDisplayW / previewImg.width;

  canvas.width = previewImg.width * scale;
  canvas.height = previewImg.height * scale;
  ctx.drawImage(previewImg, 0, 0, canvas.width, canvas.height);

  const p = getCurrentSettings();
  applyWatermarkToCanvas(ctx, canvas.width, canvas.height, p);

  updateMaskBoxUI(p);
}

function updateMaskBoxUI(p) {
    const maskBox = document.getElementById("safeZoneBox");
    if (!maskBox) return;
    const canvas = document.getElementById("previewCanvas");

    if (p.usageMode === 'idcard' && p.mask) {
        maskBox.style.display = 'block';
        maskBox.style.left = (p.mask.x * canvas.clientWidth) + 'px';
        maskBox.style.top = (p.mask.y * canvas.clientHeight) + 'px';
        maskBox.style.width = (p.mask.w * canvas.clientWidth) + 'px';
        maskBox.style.height = (p.mask.h * canvas.clientHeight) + 'px';
    } else if (p.usageMode === 'idcard') {
        maskBox.style.display = 'block';
    } else {
        maskBox.style.display = 'none';
    }

    const textBox = document.getElementById("watermarkTextBox");
    if (!textBox) return;

    if (p.usageMode === 'general' && p.currentMode === 'single') {
        textBox.style.display = 'flex';
        if (p.textBoxRect) {
            textBox.style.left = (p.textBoxRect.x * canvas.clientWidth) + 'px';
            textBox.style.top = (p.textBoxRect.y * canvas.clientHeight) + 'px';
            textBox.style.width = (p.textBoxRect.w * canvas.clientWidth) + 'px';
            textBox.style.height = (p.textBoxRect.h * canvas.clientHeight) + 'px';
        } else {
            // default center text box
            textBox.style.left = '30%';
            textBox.style.top = '30%';
            textBox.style.width = '200px';
            textBox.style.height = '60px';
        }

        if (p.isVertical) {
            textBox.classList.add("vertical-text");
            if (!p.textBoxRect) {
               textBox.style.width = '60px';
               textBox.style.height = '200px';
            }
        } else {
            textBox.classList.remove("vertical-text");
        }

        // Sync rotation to DOM element
        textBox.style.transform = `rotate(${p.rotate}deg)`;
    } else {
        textBox.style.display = 'none';
    }
}

export function syncUIWithSettings() {
    const s = getCurrentSettings();
    document.getElementById("btnModeGeneral").className = s.usageMode === "general" ? "mode-btn active" : "mode-btn";
    document.getElementById("btnModeID").className = s.usageMode === "idcard" ? "mode-btn active" : "mode-btn";
    document.getElementById("idModeHint").style.display = s.usageMode === "idcard" ? "block" : "none";

    document.getElementById("btnSingle").className = s.currentMode === "single" ? "mode-btn active" : "mode-btn";
    document.getElementById("btnTiled").className = s.currentMode === "tiled" ? "mode-btn active" : "mode-btn";

    const singleControls = document.getElementById("singleControls");
    const tiledControls = document.getElementById("tiledControls");
    if(singleControls) singleControls.style.display = (s.currentMode === "single" && s.usageMode !== 'general') ? "block" : "none";
    if(tiledControls) tiledControls.style.display = s.currentMode === "tiled" ? "block" : "none";

    document.getElementById("wmText").value = s.text;
    document.getElementById("wmFont").value = s.font;

    const chkVert = document.getElementById("chkVerticalText");
    if(chkVert) chkVert.checked = !!s.isVertical;

    document.getElementById("sizeRange").value = s.size;
    document.getElementById("sizeNum").value = s.size;
    document.getElementById("rotRange").value = s.rotate;
    document.getElementById("rotNum").value = s.rotate;
    document.getElementById("opRange").value = s.opacity * 100;
    document.getElementById("opNum").value = s.opacity * 100;
    document.getElementById("gapRange").value = s.gap;
    document.getElementById("gapNum").value = s.gap;

    document.querySelectorAll(".grid-btn").forEach((b) => b.classList.remove("active"));
    const t = document.getElementById("btn-" + s.currentPos);
    if (t) t.classList.add("active");

    applyColorToUI(s.color);

    updateCarouselUI();
}

export function createWhitePlaceholder(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d");
  cx.fillStyle = "white";
  cx.fillRect(0, 0, w, h);
  return c.toDataURL();
}

export function setUsageMode(mode) {
  updateCurrentSettings({ usageMode: mode, currentMode: mode === 'idcard' ? 'tiled' : 'single' });
  syncUIWithSettings();
  updatePreview();
}

export function setMode(mode) {
  updateCurrentSettings({ currentMode: mode });
  syncUIWithSettings();
  updatePreview();
}

export function setPos(pos) {
  updateCurrentSettings({ currentPos: pos, customPosRel: null });
  syncUIWithSettings();
  updatePreview();
}

export function syncNum(id, val) {
  let safeVal = parseInt(val);
  if(id === 'size') safeVal = validateSizeBoundary(safeVal);
  if(id === 'op') safeVal = validateOpacityBoundary(safeVal);
  if(id === 'rot') safeVal = isNaN(safeVal) ? 0 : safeVal % 360;
  if(id === 'gap') safeVal = isNaN(safeVal) ? 150 : Math.max(50, Math.min(safeVal, 500));

  document.getElementById(id + "Num").value = safeVal;
  document.getElementById(id + "Range").value = safeVal;

  const updateMap = {
      'size': { size: safeVal },
      'rot': { rotate: safeVal },
      'op': { opacity: safeVal / 100 },
      'gap': { gap: safeVal }
  };
  if(updateMap[id]) updateCurrentSettings(updateMap[id]);
  updatePreview();
}

export function syncRange(id, val) {
  syncNum(id, val);
}
export function reportError(msg) {
    const errorBox = document.getElementById("statusMsg");
    if(errorBox) {
        errorBox.style.color = "red";
        errorBox.innerText = msg;
    }
}

export function clearError() {
    const errorBox = document.getElementById("statusMsg");
    if(errorBox) {
        errorBox.style.color = "";
        errorBox.innerText = "";
    }
}

export function validateSizeBoundary(val) {
    let size = parseInt(val);
    if(isNaN(size)) size = 50;
    if(size < 10) size = 10;
    if(size > 200) size = 200;
    return size;
}

export function validateOpacityBoundary(val) {
    let op = parseInt(val);
    if(isNaN(op)) op = 40;
    if(op < 0) op = 0;
    if(op > 100) op = 100;
    return op;
}
