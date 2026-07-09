import { state } from './state.js';
import { updatePreview, syncUIWithSettings } from './ui.js';

export function updateCarouselUI() {
    const cc = document.getElementById("carouselControls");
    const dots = document.getElementById("carouselDots");
    const info = document.getElementById("fileInfoCarousel");
    if (!cc || !dots || !info) return;

    if (state.files.length <= 1) {
        cc.style.display = "none";
        info.innerText = state.files.length === 1 ? `已選擇 1 個檔案` : "尚未選擇";
        return;
    }

    cc.style.display = "flex";
    info.innerText = `檔案 ${state.currentIndex + 1} / ${state.files.length} (${state.files[state.currentIndex].name})`;

    // Update dots
    dots.innerHTML = "";
    for (let i = 0; i < state.files.length; i++) {
        const dot = document.createElement("div");
        dot.className = "carousel-dot" + (i === state.currentIndex ? " active" : "");
        dot.onclick = () => goToIndex(i);
        dots.appendChild(dot);
    }

    document.getElementById("btnPrevFile").disabled = state.currentIndex === 0;
    document.getElementById("btnNextFile").disabled = state.currentIndex === state.files.length - 1;
}

export function goToIndex(i) {
    if (i < 0 || i >= state.files.length || i === state.currentIndex) return;
    state.currentIndex = i;
    updateCarouselUI();
    syncUIWithSettings();
    updatePreview();
}

export function nextFile() {
    goToIndex(state.currentIndex + 1);
}

export function prevFile() {
    goToIndex(state.currentIndex - 1);
}

// Touch swipe logic for canvas-wrapper
let touchStartX = 0;
export function handleTouchStart(e) {
    if(state.files.length <= 1) return;
    touchStartX = e.changedTouches[0].screenX;
}

export function handleTouchEnd(e) {
    if(state.files.length <= 1) return;
    let touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) {
        // swipe left -> next
        nextFile();
    } else if (touchEndX > touchStartX + 50) {
        // swipe right -> prev
        prevFile();
    }
}
