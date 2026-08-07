import { Component, inject, HostListener, OnInit } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  templateUrl: './color-picker.html'
})
export class ColorPickerComponent implements OnInit {
  stateService = inject(WatermarkStateService);

  menuOpen = false;
  customOpen = false;

  themeColors = [
    ["#FFFFFF", "#000000", "#E7E6E6", "#44546A", "#5B9BD5", "#ED7D31", "#A5A5A5", "#FFC000", "#4472C4", "#70AD47"],
    ["#F2F2F2", "#7F7F7F", "#D0CECE", "#D6DCE4", "#DEEBF6", "#FBE5D5", "#EDEDED", "#FFF2CC", "#D9E1F2", "#E2EFDA"],
    ["#D9D9D9", "#595959", "#AEABAB", "#ADB9CA", "#BDD7EE", "#F8CBAD", "#DBDBDB", "#FFE699", "#B4C6E7", "#C6E0B4"],
    ["#BFBFBF", "#3F3F3F", "#757171", "#8497B0", "#9CC2E5", "#F4B084", "#C9C9C9", "#FFD966", "#8EA9DB", "#A9D08E"],
    ["#A6A6A6", "#262626", "#3A3838", "#333F4F", "#2F5597", "#C65911", "#7B7B7B", "#BF9000", "#305496", "#548235"],
    ["#7F7F7F", "#0C0C0C", "#161616", "#222B35", "#203764", "#833C0C", "#525252", "#806000", "#203864", "#375623"]
  ];
  themeColorsFlat = this.themeColors.flat();
  standardColors = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];

  inputHex = '#FF0000';
  inputR = 255;
  inputG = 0;
  inputB = 0;

  savedColor = '#FF0000';

  ngOnInit() {
    this.updateLocalInputs(this.stateService.watermarkColor());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.color-control-wrapper') && !target.closest('.relative')) {
      this.menuOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.savedColor = this.stateService.watermarkColor();
    }
  }

  toggleCustom() {
    this.customOpen = !this.customOpen;
  }

  tempUpdatePreview(hex: string | null) {
    if (hex) {
      this.stateService.watermarkColor.set(hex);
      this.updateLocalInputs(hex);
    } else {
      this.stateService.watermarkColor.set(this.savedColor);
      this.updateLocalInputs(this.savedColor);
    }
  }

  selectColor(hex: string) {
    this.savedColor = hex;
    this.stateService.watermarkColor.set(hex);
    this.updateLocalInputs(hex);
    this.menuOpen = false;
  }

  syncColor(src: 'picker' | 'hex' | 'rgb', event: Event) {
    let hex = this.inputHex;
    let r = this.inputR;
    let g = this.inputG;
    let b = this.inputB;

    if (src === 'picker' || src === 'hex') {
      hex = (event.target as HTMLInputElement).value;
      if (src === 'hex' && !/^#[0-9A-F]{6}$/i.test(hex)) return;
      const rgb = this.hexToRgb(hex);
      r = rgb.r; g = rgb.g; b = rgb.b;
    } else if (src === 'rgb') {
      const parent = (event.target as HTMLElement).parentElement;
      if (!parent) return;
      const inputs = parent.querySelectorAll('input[type="number"]');
      r = parseInt((inputs[0] as HTMLInputElement).value) || 0;
      g = parseInt((inputs[1] as HTMLInputElement).value) || 0;
      b = parseInt((inputs[2] as HTMLInputElement).value) || 0;
      hex = this.rgbToHex(r, g, b);
    }

    this.inputHex = hex;
    this.inputR = r;
    this.inputG = g;
    this.inputB = b;
    this.savedColor = hex;
    this.stateService.watermarkColor.set(hex);
  }

  updateLocalInputs(hex: string) {
    this.inputHex = hex;
    const rgb = this.hexToRgb(hex);
    this.inputR = rgb.r;
    this.inputG = rgb.g;
    this.inputB = rgb.b;
  }

  hexToRgb(hex: string) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  rgbToHex(r: number, g: number, b: number) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
  }
}
