import { Component, signal } from '@angular/core';
import { PreviewPaneComponent } from '../preview-pane/preview-pane';
import { ControlPaneComponent } from '../control-pane/control-pane';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [PreviewPaneComponent, ControlPaneComponent],
  templateUrl: './workspace.html'
})
export class WorkspaceComponent {
  activeTab = signal<'preview' | 'settings'>('preview');

  setTab(tab: 'preview' | 'settings') {
    this.activeTab.set(tab);
  }
}
