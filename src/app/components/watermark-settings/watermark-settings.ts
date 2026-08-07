import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-watermark-settings',
  standalone: true,
  templateUrl: './watermark-settings.html'
})
export class WatermarkSettingsComponent {
  stateService = inject(WatermarkStateService);

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

  updateFont(event: Event) {
    this.stateService.watermarkFont.set((event.target as HTMLSelectElement).value);
  }
}
