import { getCurrentSettings, updateCurrentSettings } from './state.js';
import { updatePreview } from './ui.js';

export const themeColors = [
  ["#FFFFFF", "#000000", "#E7E6E6", "#44546A", "#5B9BD5", "#ED7D31", "#A5A5A5", "#FFC000", "#4472C4", "#70AD47"],
  ["#F2F2F2", "#7F7F7F", "#D0CECE", "#D6DCE4", "#DEEBF6", "#FBE5D5", "#EDEDED", "#FFF2CC", "#D9E1F2", "#E2EFDA"],
  ["#D9D9D9", "#595959", "#AEABAB", "#ADB9CA", "#BDD7EE", "#F8CBAD", "#DBDBDB", "#FFE699", "#B4C6E7", "#C6E0B4"],
  ["#BFBFBF", "#3F3F3F", "#757171", "#8497B0", "#9CC2E5", "#F4B084", "#C9C9C9", "#FFD966", "#8EA9DB", "#A9D08E"],
  ["#A6A6A6", "#262626", "#3A3838", "#333F4F", "#2F5597", "#C65911", "#7B7B7B", "#BF9000", "#305496", "#548235"],
  ["#7F7F7F", "#0C0C0C", "#161616", "#222B35", "#203764", "#833C0C", "#525252", "#806000", "#203864", "#375623"],
];
export const standardColors = [
  "#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0",
];

let savedColor = "#FF0000";

export function initColorGrid() {
  const tG = document.getElementById("themeColorGrid");
  const sG = document.getElementById("standardColorGrid");
  if (!tG || !sG) return;
  themeColors.forEach((r) => r.forEach((c) => tG.appendChild(createSwatch(c))));
  standardColors.forEach((c) => sG.appendChild(createSwatch(c)));
}

function createSwatch(c) {
  const d = document.createElement("div");
  d.className = "swatch";
  d.style.backgroundColor = c;
  d.title = c;
  d.onmouseenter = () => tempUpdatePreview(c);
  d.onmouseleave = () => tempUpdatePreview(savedColor);
  d.onclick = () => {
    savedColor = c;
    updateInputValues(c);
    toggleColorMenu();
    updateCurrentSettings({ color: c });
    updatePreview();
  };
  return d;
}

export function toggleColorMenu() {
  const p = document.getElementById("colorPopup");
  if (!p) return;
  p.style.display = p.style.display === "none" ? "block" : "none";
  if (p.style.display === "block")
    savedColor = document.getElementById("colorHex").value;
}

export function toggleCustomColor() {
  const p = document.getElementById("customColorPanel");
  if (p) p.style.display = p.style.display === "none" ? "block" : "none";
}

function tempUpdatePreview(hex) {
  const hexIn = document.getElementById("colorHex");
  const cbox = document.getElementById("currentColorBox");
  if (hexIn) hexIn.value = hex;
  if (cbox) {
    cbox.style.borderBottomColor = hex;
    cbox.style.color = hex;
  }
  updateCurrentSettings({ color: hex });
  updatePreview();
}

function updateInputValues(hex) {
  const hexIn = document.getElementById("colorHex");
  if (hexIn) hexIn.value = hex;
  const rgb = hexToRgb(hex);
  const rIn = document.getElementById("colorR");
  const gIn = document.getElementById("colorG");
  const bIn = document.getElementById("colorB");
  if (rIn) rIn.value = rgb.r;
  if (gIn) gIn.value = rgb.g;
  if (bIn) bIn.value = rgb.b;
  const cbox = document.getElementById("currentColorBox");
  if (cbox) {
    cbox.style.borderBottomColor = hex;
    cbox.style.color = hex;
  }
}

export function syncColor(src) {
  const picker = document.getElementById("colorPicker");
  const hexIn = document.getElementById("colorHex");
  const rIn = document.getElementById("colorR");
  const gIn = document.getElementById("colorG");
  const bIn = document.getElementById("colorB");
  let r, g, b, hex;
  if (src === "picker") {
    hex = picker.value;
    const c = hexToRgb(hex);
    r = c.r; g = c.g; b = c.b;
  } else if (src === "hex") {
    hex = hexIn.value;
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
    const c = hexToRgb(hex);
    r = c.r; g = c.g; b = c.b;
  } else if (src === "rgb") {
    r = parseInt(rIn.value) || 0;
    g = parseInt(gIn.value) || 0;
    b = parseInt(bIn.value) || 0;
    hex = rgbToHex(r, g, b);
  }
  if (src !== "picker" && picker) picker.value = hex;
  if (src !== "hex" && hexIn) hexIn.value = hex;
  if (src !== "rgb") {
    if (rIn) rIn.value = r;
    if (gIn) gIn.value = g;
    if (bIn) bIn.value = b;
  }
  savedColor = hex;
  const cbox = document.getElementById("currentColorBox");
  if (cbox) {
    cbox.style.borderBottomColor = hex;
    cbox.style.color = hex;
  }
  updateCurrentSettings({ color: hex });
  updatePreview();
}

export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function applyColorToUI(hex) {
    updateInputValues(hex);
}
