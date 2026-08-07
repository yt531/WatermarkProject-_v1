import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-position-density',
  standalone: true,
  templateUrl: './position-density.html'
})
export class PositionDensityComponent {
  stateService = inject(WatermarkStateService);

  getGridBtnClass(pos: string) {
    const base = 'h-[25px] max-md:h-[40px] border border-[#ccc] cursor-pointer max-md:min-h-[44px] transition-colors ';
    if (!this.stateService.watermarkCustomPos() && this.stateService.watermarkPos() === pos) {
      return base + 'bg-(--color-primary) border-(--color-primary)';
    }
    return base + 'bg-[#f0f0f0] hover:bg-[#e0e0e0]';
  }

  setPos(pos: string) {
    this.stateService.watermarkPos.set(pos);
    this.stateService.watermarkCustomPos.set(null);
  }

  updateGap(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.stateService.watermarkGap.set(val);
    }
  }
}
