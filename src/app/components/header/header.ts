import { Component, inject } from '@angular/core';
import { WatermarkExportService } from '../../services/watermark-export.service';
import { WatermarkStateService } from '../../services/watermark-state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  exportService = inject(WatermarkExportService);
  stateService = inject(WatermarkStateService);

  isProcessing = false;
  statusMsg = '';

  get hasFiles() {
    return this.stateService.files().length > 0;
  }

  async processAll() {
    if (this.isProcessing || !this.hasFiles) return;
    this.isProcessing = true;
    this.statusMsg = '';

    try {
      await this.exportService.processAll((msg) => {
        this.statusMsg = msg;
      });
    } catch (e) {
      // Error is handled in service
    } finally {
      this.isProcessing = false;
    }
  }
}
