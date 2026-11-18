import { Component, ElementRef, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
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
  cdr = inject(ChangeDetectorRef);

  isProcessing = false;
  statusMsg = '';

  @ViewChild('helpDialog') helpDialog!: ElementRef<HTMLDialogElement>;

  readonly helpSteps = [
    { title: '匯入', text: '選擇圖片或 PDF。' },
    { title: '內容', text: '選擇用途與排列方式，輸入文字並挑選字型。證件保護會留出一塊不加浮水印的紅框，可在預覽圖上拖曳調整。' },
    { title: '樣式', text: '調整大小、角度、透明度與顏色。' },
    { title: '版面', text: '單一浮水印可用九宮格定位，也能直接在預覽圖上拖曳；鋪滿可調整間距。' },
    { title: '匯出', text: '設定檔名與格式。PDF 可指定套用頁面與解析度，倍率越高越清晰，檔案也越大。' },
    { title: '預覽', text: '點預覽圖右上角的圖示可全螢幕檢視，並用雙指縮放。' },
  ];

  openHelp() {
    this.helpDialog.nativeElement.showModal();
  }

  closeHelp() {
    this.helpDialog.nativeElement.close();
  }

  onHelpBackdropClick(event: MouseEvent) {
    // 點到 dialog 本身（也就是背景）才關閉，內容區的點擊不受影響
    if (event.target === this.helpDialog.nativeElement) this.closeHelp();
  }

  get hasFiles() {
    return this.stateService.files().length > 0;
  }

  async processAll() {
    if (this.isProcessing || !this.hasFiles) return;
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
