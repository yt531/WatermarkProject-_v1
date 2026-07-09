import { state, getCurrentSettings, updateCurrentSettings, initSettingsForFiles } from './state.js';
import { updatePreview, syncUIWithSettings, createWhitePlaceholder, setUsageMode, setMode, setPos, syncNum, syncRange, reportError, clearError } from './ui.js';
import { initInteractions } from './interactions.js';
import { initColorGrid, toggleColorMenu, toggleCustomColor, syncColor } from './color.js';
import { setApplyToAll } from './state.js';
import { prevFile, nextFile, handleTouchStart, handleTouchEnd } from './carousel.js';
import { processAll } from './export.js';

document.addEventListener("DOMContentLoaded", () => {
  initColorGrid();
  syncColor("hex");
  syncUIWithSettings();

  document.addEventListener("click", (e) => {
    const cw = document.querySelector(".color-control-wrapper");
    if (cw && !cw.contains(e.target)) {
      const p = document.getElementById("colorPopup");
      if(p) p.style.display = "none";
    }
  });

  initInteractions();

  // Attach global handlers for HTML inline attributes
  window.setUsageMode = setUsageMode;
  window.setMode = setMode;
  window.setPos = setPos;
  window.syncNum = syncNum;
  window.syncRange = syncRange;
  window.toggleColorMenu = toggleColorMenu;
  window.toggleCustomColor = toggleCustomColor;
  window.syncColor = syncColor;
  window.handleFiles = handleFiles;
  window.prevFile = prevFile;
  window.nextFile = nextFile;
  window.toggleApplyAll = () => {
    const chk = document.getElementById("chkApplyAll");
    if(chk) setApplyToAll(chk.checked);
    syncUIWithSettings();
    updatePreview();
  };
  window.toggleVerticalText = () => {
    const chk = document.getElementById("chkVerticalText");
    if(chk) updateCurrentSettings({ isVertical: chk.checked });
    updatePreview();
  };
  window.toggleFullscreen = () => {
    const overlay = document.getElementById("fullscreenOverlay");
    const fsImg = document.getElementById("fullscreenImg");
    const canvas = document.getElementById("previewCanvas");

    if (overlay.style.display === "none") {
        fsImg.src = canvas.toDataURL();
        overlay.style.display = "flex";
    } else {
        overlay.style.display = "none";
        fsImg.src = "";
    }
  };

  const canvasWrapper = document.getElementById("canvasWrapper");
  if(canvasWrapper) {
      canvasWrapper.addEventListener('touchstart', handleTouchStart, {passive: true});
      canvasWrapper.addEventListener('touchend', handleTouchEnd, {passive: true});
  }

  const dlBtn = document.getElementById("dlBtn");
  if(dlBtn) dlBtn.onclick = processAll;

  // text input updates
  const textInput = document.getElementById("wmText");
  if(textInput) textInput.oninput = (e) => { updateCurrentSettings({text: e.target.value}); updatePreview(); };

  const fontSelect = document.getElementById("wmFont");
  if(fontSelect) fontSelect.onchange = (e) => { updateCurrentSettings({font: e.target.value}); updatePreview(); };
});

async function handleFiles() {
  const input = document.getElementById("fileInput");

  // Basic validation
  const validFiles = Array.from(input.files).filter(f => {
      const type = f.type;
      return type.startsWith("image/") || type === "application/pdf";
  });

  if(validFiles.length !== input.files.length) {
      reportError("部分檔案格式不支援，僅載入支援的圖片與 PDF。");
  } else {
      clearError();
  }

  state.files = validFiles;
  state.lastJobSignature = null;

  if (state.files.length === 0) return;

  const fileInfo = document.getElementById("fileInfo");
  if(fileInfo) fileInfo.innerText = `已選擇 ${state.files.length} 個檔案`;

  const dlBtn = document.getElementById("dlBtn");
  if(dlBtn) dlBtn.disabled = false;

  const welcomeMsg = document.getElementById("welcomeMsg");
  if(welcomeMsg) welcomeMsg.style.display = "none";

  initSettingsForFiles(state.files.length);
  state.currentIndex = 0;
  state.previewImgs = new Array(state.files.length);

  const applyToggle = document.getElementById("applyAllToggle");
  if(applyToggle) {
      applyToggle.style.display = state.files.length > 1 ? "block" : "none";
  }

  await loadFilePreview(0);
}

async function loadFilePreview(index) {
  if (index < 0 || index >= state.files.length) return;
  const file = state.files[index];

  state.previewImgs[index] = new Image();

  if (file.type === "application/pdf") {
    await renderPdfToPreview(file, index);
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.previewImgs[index].src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  state.previewImgs[index].onload = () => {
    state.isLoaded = true;
    syncUIWithSettings();
    updatePreview();

    // scroll to top on mobile
    if (window.innerWidth <= 768) {
      const pane = document.getElementById("previewPane");
      if(pane) pane.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}

async function renderPdfToPreview(file, index) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const c = document.createElement("canvas");
    const cx = c.getContext("2d");
    c.width = viewport.width;
    c.height = viewport.height;
    await page.render({ canvasContext: cx, viewport: viewport }).promise;
    state.previewImgs[index].src = c.toDataURL("image/jpeg");
  } catch (e) {
    console.error(e);
    state.previewImgs[index].src = createWhitePlaceholder(600, 800);
  }
}
