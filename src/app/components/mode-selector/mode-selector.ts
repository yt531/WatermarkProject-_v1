import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  templateUrl: './mode-selector.html'
})
export class ModeSelectorComponent {
  stateService = inject(WatermarkStateService);

  setUsageMode(mode: 'general' | 'idcard') {
    this.stateService.usageMode.set(mode);
    // when switching to idcard, it forces tiled mode in legacy script
    if (mode === 'idcard') {
      this.stateService.watermarkMode.set('tiled');
    } else {
      this.stateService.watermarkMode.set('single');
    }
  }

  getBtnClass(mode: 'general' | 'idcard') {
    const base = 'flex-1 border-none p-1.5 cursor-pointer text-[13px] max-md:min-h-[44px] max-md:text-[14px] ';
    if (this.stateService.usageMode() === mode) {
      return base + 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-sm font-bold text-(--color-primary)';
    }
    return base + 'bg-transparent';
  }
}
