import { Component, ViewChild } from '@angular/core';
import { PreviewPaneComponent } from '../preview-pane/preview-pane';
import { ControlPaneComponent } from '../control-pane/control-pane';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [PreviewPaneComponent, ControlPaneComponent],
  templateUrl: './workspace.html'
})
export class WorkspaceComponent {
  @ViewChild('controlPane') controlPane!: ControlPaneComponent;

  onPreviewClick() {
    if (this.controlPane) {
      this.controlPane.closeMobileMenu();
    }
  }
}
