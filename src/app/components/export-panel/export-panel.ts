import { Component, inject } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';
import { WatermarkExportService } from '../../services/watermark-export.service';

@Component({
  selector: 'app-export-panel',
  standalone: true,
  templateUrl: './export-panel.html'
})
export class ExportPanelComponent {
  stateService = inject(WatermarkStateService);
  exportService = inject(WatermarkExportService);
  get isProcessing() { return this.exportService.isProcessing(); }
  get statusMsg() { return this.exportService.statusMsg(); }

  updateName(event: Event) {
    this.stateService.outputFileName.set((event.target as HTMLInputElement).value);
  }

  setFormat(format: string) {
    this.stateService.outputFormat.set(format);
  }

  readonly scaleOptions = [1, 1.5, 2, 3];

  updatePageRange(event: Event) {
    this.stateService.pageRange.set((event.target as HTMLInputElement).value);
  }

  setScale(scale: number) {
    this.stateService.exportScale.set(scale);
  }

  getScaleBtnClass(scale: number) {
    return this.stateService.exportScale() === scale
      ? 'bg-(--color-primary) text-white'
      : 'bg-transparent text-[#555] hover:bg-[#e0e0e0]';
  }

  /** 目前設定下，PDF 會被加浮水印的頁數 */
  selectedPageCount() {
    const r = this.stateService.pageRangeResult();
    return 'pages' in r ? r.pages.length : 0;
  }

  getFormatBtnClass(format: string) {
    if (this.stateService.outputFormat() === format) {
      return 'bg-(--color-primary) text-white';
    }
    return 'bg-transparent text-[#555] hover:bg-[#e0e0e0]';
  }

  processAll() {
    return this.exportService.runExport();
  }
}
