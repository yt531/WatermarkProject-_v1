import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-watermark-settings',
  standalone: true,
  templateUrl: './watermark-settings.html'
})
export class WatermarkSettingsComponent {
  stateService = inject(WatermarkStateService);

  fonts = [
    { value: 'Arial', label: 'Arial', sub: '(無襯線)' },
    { value: 'Times New Roman', label: 'Times', sub: '(襯線)' },
    { value: 'Courier New', label: 'Courier', sub: '(等寬)' },
    { value: 'Microsoft JhengHei', label: '微軟正黑體', sub: '' }
  ];

  isFontDropdownOpen = false;

  getModeBtnClass(mode: 'single' | 'tiled') {
    const base = 'flex-1 border-none p-1.5 cursor-pointer text-[13px] max-md:min-h-[44px] max-md:text-[14px] ';
    if (this.stateService.watermarkMode() === mode) {
      return base + 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-sm font-bold text-(--color-primary)';
    }
    return base + 'bg-transparent';
  }

  updateText(event: Event) {
    this.stateService.watermarkText.set((event.target as HTMLInputElement).value);
  }

  toggleFontDropdown() {
    this.isFontDropdownOpen = !this.isFontDropdownOpen;
    if (!this.isFontDropdownOpen) {
      this.stateService.previewFont.set(null);
    }
  }

  closeFontDropdown() {
    this.isFontDropdownOpen = false;
    this.stateService.previewFont.set(null);
  }

  onFontHover(fontValue: string) {
    this.stateService.previewFont.set(fontValue);
  }

  onFontLeave() {
    this.stateService.previewFont.set(null);
  }

  selectFont(fontValue: string) {
    this.stateService.watermarkFont.set(fontValue);
    this.stateService.previewFont.set(null);
    this.isFontDropdownOpen = false;
  }

  get currentFontLabel(): string {
    const font = this.fonts.find(f => f.value === this.stateService.watermarkFont());
    return font ? `${font.label} ${font.sub}`.trim() : this.stateService.watermarkFont();
  }
}
