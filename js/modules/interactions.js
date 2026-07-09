import { state, getCurrentSettings, updateCurrentSettings } from './state.js';
import { updatePreview } from './ui.js';

let wmDragOffsetX = 0;
let wmDragOffsetY = 0;

export function initInteractions() {
  initDraggableElement("safeZoneBox", "mask");
  initDraggableElement("watermarkTextBox", "textBoxRect");

  const maskBox = document.getElementById("safeZoneBox");
  if(maskBox) {
      const resizeObserver = new ResizeObserver(() => updatePreview());
      resizeObserver.observe(maskBox);
  }

  const textBox = document.getElementById("watermarkTextBox");
  if(textBox) {
      const resizeObserver2 = new ResizeObserver(() => updatePreview());
      resizeObserver2.observe(textBox);
  }
}

function initDraggableElement(elementId, settingKey) {
  const el = document.getElementById(elementId);
  const canvas = document.getElementById("previewCanvas");
  if(!el || !canvas) return;

  let interactionState = null; // 'move' 或 'resize'
  let resizeDir = "";

  let startX, startY;
  let startLeft, startTop, startWidth, startHeight;

  const startAction = (e) => {
    if (e.target.classList.contains("resize-handle")) {
      interactionState = "resize";
      resizeDir = e.target.getAttribute("data-dir");
    } else if (
      e.target.id === elementId ||
      e.target.parentNode.id === elementId
    ) {
      interactionState = "move";
    } else {
      return;
    }

    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

    startX = clientX;
    startY = clientY;

    startLeft = el.offsetLeft;
    startTop = el.offsetTop;
    startWidth = el.offsetWidth;
    startHeight = el.offsetHeight;

    e.preventDefault();
  };

  const doAction = (e) => {
    if (!interactionState) return;
    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (interactionState === "move") {
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      const maxLeft = canvas.clientWidth - startWidth;
      const maxTop = canvas.clientHeight - startHeight;

      // Allow dragging out slightly for text
      if (settingKey === "mask") {
          if (newLeft < 0) newLeft = 0;
          if (newTop < 0) newTop = 0;
          if (newLeft > maxLeft) newLeft = maxLeft;
          if (newTop > maxTop) newTop = maxTop;
      }

      el.style.left = newLeft + "px";
      el.style.top = newTop + "px";

      if(settingKey === "textBoxRect") {
          document.querySelectorAll(".grid-btn").forEach((b) => b.classList.remove("active"));
          updateCurrentSettings({ currentPos: "custom" });
      }

    } else if (interactionState === "resize") {
      let newW = startWidth;
      let newH = startHeight;
      let newL = startLeft;
      let newT = startTop;

      if (resizeDir.includes("e")) newW = startWidth + dx;
      if (resizeDir.includes("w")) {
        newW = startWidth - dx;
        newL = startLeft + dx;
      }
      if (resizeDir.includes("s")) newH = startHeight + dy;
      if (resizeDir.includes("n")) {
        newH = startHeight - dy;
        newT = startTop + dy;
      }

      if (newW < 20) {
        if (resizeDir.includes("w")) newL = startLeft + startWidth - 20;
        newW = 20;
      }
      if (newH < 20) {
        if (resizeDir.includes("n")) newT = startTop + startHeight - 20;
        newH = 20;
      }

      if (settingKey === "mask") {
          if (newL < 0) { newW += newL; newL = 0; }
          if (newT < 0) { newH += newT; newT = 0; }
          if (newL + newW > canvas.clientWidth) newW = canvas.clientWidth - newL;
          if (newT + newH > canvas.clientHeight) newH = canvas.clientHeight - newT;
      }

      el.style.width = newW + "px";
      el.style.height = newH + "px";
      el.style.left = newL + "px";
      el.style.top = newT + "px";

      if(settingKey === "textBoxRect") {
          document.querySelectorAll(".grid-btn").forEach((b) => b.classList.remove("active"));
          updateCurrentSettings({ currentPos: "custom" });
      }
    }

    // update state
    updateCurrentSettings({
        [settingKey]: {
          x: el.offsetLeft / canvas.clientWidth,
          y: el.offsetTop / canvas.clientHeight,
          w: el.offsetWidth / canvas.clientWidth,
          h: el.offsetHeight / canvas.clientHeight,
        }
    });
    updatePreview();
  };

  const stopAction = () => {
    interactionState = null;
  };

  el.addEventListener("mousedown", startAction);
  el.addEventListener("touchstart", startAction, { passive: false });
  window.addEventListener("mousemove", doAction);
  window.addEventListener("touchmove", doAction, { passive: false });
  window.addEventListener("mouseup", stopAction);
  window.addEventListener("touchend", stopAction);
}
