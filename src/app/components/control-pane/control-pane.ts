import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatermarkStateService } from '../../services/watermark-state.service';
import { ModeSelectorComponent } from '../mode-selector/mode-selector';
import { FileUploaderComponent } from '../file-uploader/file-uploader';
import { WatermarkSettingsComponent } from '../watermark-settings/watermark-settings';
import { AppearanceSettingsComponent } from '../appearance-settings/appearance-settings';
import { PositionDensityComponent } from '../position-density/position-density';
import { ExportPanelComponent } from '../export-panel/export-panel';
import { SubTab, SubTabsComponent } from '../sub-tabs/sub-tabs';

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
    SubTabsComponent,
    CommonModule
  ],
  templateUrl: './control-pane.html'
})
export class ControlPaneComponent {
  stateService = inject(WatermarkStateService);

  activeMobileMenu: string | null = null;

  // 手機版面板內的子標籤：一次只顯示一個區塊
  readonly contentTabs: SubTab[] = [
    { id: 'purpose', label: '用途' },
    { id: 'layout', label: '排列' },
    { id: 'text', label: '文字' },
    { id: 'font', label: '字型' },
  ];
  readonly styleTabs: SubTab[] = [
    { id: 'look', label: '外觀' },
    { id: 'color', label: '顏色' },
  ];
  contentSub = 'purpose';
  styleSub = 'look';
  exportSub = 'name';

  /** 匯出標籤：只有載入 PDF 時才有「PDF 設定」 */
  private readonly exportTabsBase: SubTab[] = [
    { id: 'name', label: '檔名' },
    { id: 'format', label: '格式' },
  ];
  private readonly exportTabsWithPdf: SubTab[] = [...this.exportTabsBase, { id: 'pdf', label: 'PDF 設定' }];

  get exportTabs(): SubTab[] {
    return this.stateService.hasPdf() ? this.exportTabsWithPdf : this.exportTabsBase;
  }

  /** 目前選的標籤已不存在（例如換成非 PDF 檔案）時退回第一個 */
  get exportSubEffective(): string {
    return this.exportTabs.some((t) => t.id === this.exportSub) ? this.exportSub : 'name';
  }

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
    const isActive = this.activeMobileMenu === menu;
    const displayClass = isActive ? 'flex' : 'hidden md:flex';
    return `${displayClass} w-full flex-col bg-white max-h-[50vh] overflow-y-auto overscroll-contain md:max-h-none md:overflow-visible md:bg-transparent pointer-events-auto`;
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
