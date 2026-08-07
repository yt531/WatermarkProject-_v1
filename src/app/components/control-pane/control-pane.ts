import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    ExportPanelComponent,
    CommonModule
  ],
  templateUrl: './control-pane.html'
})
export class ControlPaneComponent {
  stateService = inject(WatermarkStateService);

  activeMobileMenu: string | null = null;

  toggleMobileMenu(menu: string) {
    if (this.activeMobileMenu === menu) {
      this.activeMobileMenu = null;
    } else {
      this.activeMobileMenu = menu;
    }
  }

  closeMobileMenu() {
    this.activeMobileMenu = null;
  }

  getPanelClass(menu: string) {
    const base = 'absolute left-0 w-full bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-2xl transition-all duration-300 flex flex-col max-h-[70vh] overflow-y-auto overscroll-contain z-10 md:static md:bg-transparent md:shadow-none md:rounded-none md:transition-none md:max-h-none md:overflow-y-visible md:z-auto md:border-b md:border-[var(--color-border)] md:translate-y-0 md:opacity-100 md:visible md:pointer-events-auto';
    const isActive = this.activeMobileMenu === menu;
    const mobileState = isActive ? '!translate-y-0 !opacity-100 !visible pointer-events-auto' : 'translate-y-full opacity-0 invisible pointer-events-none';
    return `${base} ${mobileState}`;
  }

  getMenuBtnClass(menu: string) {
    const base = 'flex-1 flex flex-col items-center justify-center gap-1 transition-colors py-2 cursor-pointer border-none bg-transparent';
    const isActive = this.activeMobileMenu === menu;
    return `${base} ${isActive ? 'text-(--color-primary)' : 'text-gray-500'}`;
  }

  getHeaderClass() {
    return 'md:hidden flex justify-between items-center p-3 px-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl sticky top-0 z-20';
  }

  getApplyModeClass(mode: string) {
    if (this.stateService.applyMode() === mode) {
      return 'bg-(--color-primary) text-white font-bold';
    }
    return 'bg-transparent text-[#555] hover:bg-[#e0e0e0]';
  }
}
