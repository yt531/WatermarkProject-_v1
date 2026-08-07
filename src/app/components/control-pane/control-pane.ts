import { Component } from '@angular/core';
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

}
