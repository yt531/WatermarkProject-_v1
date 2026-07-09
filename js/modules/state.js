export const state = {
  files: [],
  previewImgs: [], // array of Image objects corresponding to files
  currentIndex: 0,
  applyToAll: true, // true by default, meaning settings apply to all files
  isLoaded: false,

  lastJobSignature: null,
  lastOutputName: "",

  // Settings per file. If applyToAll is true, settings[0] is used for all.
  settings: [] // array of objects
};

export const defaultSettings = {
  usageMode: "general", // 'general' | 'idcard'
  currentMode: "single", // 'single' | 'tiled'
  text: "機密 CONFIDENTIAL",
  font: "Arial",
  color: "#FF0000",
  size: 50,
  rotate: 335,
  opacity: 40,
  gap: 150,
  currentPos: "middle-center",
  customPosRel: null, // {x, y}
  mask: null // {x, y, w, h} relative
};

export function initSettingsForFiles(numFiles) {
  state.settings = Array(numFiles).fill(null).map(() => ({ ...defaultSettings }));
}

export function getCurrentSettings() {
  if (state.settings.length === 0) return { ...defaultSettings };
  if (state.applyToAll) {
    return state.settings[0];
  }
  return state.settings[state.currentIndex] || { ...defaultSettings };
}

export function updateCurrentSettings(updates) {
  if (state.settings.length === 0) return;

  if (state.applyToAll) {
    // If applying to all, we update all settings so they stay in sync,
    // or just rely on index 0 for everything. Let's just update index 0,
    // but maybe also propagate to all so if they switch off applyToAll,
    // it retains the current state.
    state.settings.forEach(s => {
      Object.assign(s, updates);
    });
  } else {
    Object.assign(state.settings[state.currentIndex], updates);
  }
}
export function setApplyToAll(val) {
    state.applyToAll = val;
}
// Update default settings to include isVertical and textBoxRect
defaultSettings.isVertical = false;
defaultSettings.textBoxRect = null; // {x, y, w, h}
