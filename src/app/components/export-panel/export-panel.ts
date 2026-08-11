import { Component, inject, ChangeDetectorRef } from '@angular/core';
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
  cdr = inject(ChangeDetectorRef);

  isProcessing = false;
  statusMsg = '';

  updateName(event: Event) {
    this.stateService.outputFileName.set((event.target as HTMLInputElement).value);
  }

  setFormat(format: string) {
    this.stateService.outputFormat.set(format);
  }

  getFormatBtnClass(format: string) {
    if (this.stateService.outputFormat() === format) {
      return 'bg-(--color-primary) text-white';
    }
    return 'bg-transparent text-[#555] hover:bg-[#e0e0e0]';
  }

  async processAll() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.statusMsg = '';
    this.cdr.detectChanges();

    try {
      await this.exportService.processAll((msg) => {
        this.statusMsg = msg;
        this.cdr.detectChanges();
      });
    } catch (e) {
      // Error is handled in service
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }
}
