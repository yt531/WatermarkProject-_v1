import { Component, inject, input } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';
import { ColorPickerComponent } from '../color-picker/color-picker';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [ColorPickerComponent],
  templateUrl: './appearance-settings.html'
})
export class AppearanceSettingsComponent {
  stateService = inject(WatermarkStateService);

  /** 手機版子標籤：只顯示對應的區塊；未指定（桌面版）時全部顯示 */
  sub = input<string | null>(null);
  hide(key: string) {
    const s = this.sub();
    return s !== null && s !== key;
  }

  updateNum(field: 'size' | 'rotate' | 'opacity', event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(val)) return;
    
    if (field === 'size') this.stateService.watermarkSize.set(val);
    else if (field === 'rotate') this.stateService.watermarkRotate.set(val);
    else if (field === 'opacity') this.stateService.watermarkOpacity.set(val);
  }
}
