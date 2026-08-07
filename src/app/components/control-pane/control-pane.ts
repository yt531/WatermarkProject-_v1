import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';
import { ModeSelectorComponent } from '../mode-selector/mode-selector';
import { FileUploaderComponent } from '../file-uploader/file-uploader';
import { WatermarkSettingsComponent } from '../watermark-settings/watermark-settings';
import { AppearanceSettingsComponent } from '../appearance-settings/appearance-settings';
import { PositionDensityComponent } from '../position-density/position-density';
import { ExportPanelComponent } from '../export-panel/export-panel';

@Component({
  selector: 'app-control-pane',
  standalone: true,
  imports: [
    ModeSelectorComponent,
    FileUploaderComponent,
    WatermarkSettingsComponent,
    AppearanceSettingsComponent,
    PositionDensityComponent,
    ExportPanelComponent
  ],
  templateUrl: './control-pane.html'
})
export class ControlPaneComponent {
  stateService = inject(WatermarkStateService);

  getApplyModeClass(mode: string) {
    if (this.stateService.applyMode() === mode) {
      return 'bg-(--color-primary) text-white font-bold';
    }
    return 'bg-transparent text-[#555] hover:bg-[#e0e0e0]';
  }
}
