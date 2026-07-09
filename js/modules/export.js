import { state, getCurrentSettings } from './state.js';
import { applyWatermarkToCanvas } from './canvas.js';

function generateCurrentSignature(p, outName, outFormat) {
  const fileFeatures = state.files.map((f) => `${f.name}-${f.size}`).join("|");
  const paramsStr = JSON.stringify(p);
  return `${fileFeatures}__${paramsStr}__${outName}_${outFormat}`;
}

export async function processAll() {
  const btn = document.getElementById("dlBtn");
  const msg = document.getElementById("statusMsg");
  if (btn.disabled) return;

  let outName = document.getElementById("outputFileName").value || "watermarked_output";
  const outFormat = document.getElementById("outputFormat").value;
  const p = getCurrentSettings();

  const currentSignature = generateCurrentSignature(p, outName, outFormat);
  if (currentSignature === state.lastJobSignature) {
    if (
      !confirm(
        `系統提示：\n\n您剛剛已經下載過內容完全相同的檔案了！\n前次檔名為：${state.lastOutputName}\n\n確定要重新執行並下載嗎？`
      )
    )
      return;
  }

  btn.disabled = true;
  btn.innerText = "處理中...";

  // Prepare data for worker
  const filesInfo = state.files.map(f => ({ file: f, name: f.name }));
  const settingsList = state.files.map((_, i) => state.applyToAll ? state.settings[0] : state.settings[i] || state.settings[0]);

  const worker = new Worker('js/modules/worker.js');

  worker.onmessage = async (e) => {
    const { type, message, result, ext } = e.data;
    if (type === 'progress') {
        msg.innerText = message;
    } else if (type === 'done') {
        let finalDownloadName = ext === "zip" ? `${outName}.zip` : `${outName}.${ext}`;
        try {
            await saveFile(result, finalDownloadName, ext);
            state.lastJobSignature = currentSignature;
            state.lastOutputName = finalDownloadName;
            msg.innerText = "完成！";
        } catch(err) {
            msg.innerText = "儲存錯誤: " + err.message;
        } finally {
            btn.disabled = false;
            btn.innerText = "另存新檔";
            worker.terminate();
        }
    } else if (type === 'error') {
        console.error("Worker Error:", message);
        msg.innerText = "處理時發生錯誤: " + message;
        btn.disabled = false;
        btn.innerText = "另存新檔";
        worker.terminate();
    }
  };

  worker.onerror = (err) => {
      console.error(err);
      msg.innerText = "Worker 發生錯誤";
      btn.disabled = false;
      btn.innerText = "另存新檔";
      worker.terminate();
  };

  worker.postMessage({
      id: Date.now(),
      type: 'start',
      filesInfo,
      settingsList,
      outName,
      outFormat
  });
}

async function saveFile(blob, suggestedName, ext) {
  if ("showSaveFilePicker" in window) {
    try {
      const types = [];
      if (ext === "pdf")
        types.push({ description: "PDF 文件", accept: { "application/pdf": [".pdf"] } });
      else if (ext === "zip")
        types.push({ description: "ZIP 壓縮檔", accept: { "application/zip": [".zip"] } });
      else if (ext === "jpg")
        types.push({ description: "JPG 圖片", accept: { "image/jpeg": [".jpg"] } });
      else if (ext === "png")
        types.push({ description: "PNG 圖片", accept: { "image/png": [".png"] } });
      else types.push({ description: "檔案", accept: { "*/*": ["." + ext] } });

      const handle = await window.showSaveFilePicker({ suggestedName, types });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Attach to window so html can call it
window.processAll = processAll;
