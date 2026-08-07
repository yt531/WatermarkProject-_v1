import { Component, inject, computed } from '@angular/core';
import { WatermarkStateService } from '../../services/watermark-state.service';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  templateUrl: './file-uploader.html'
})
export class FileUploaderComponent {
  stateService = inject(WatermarkStateService);

  fileInfoText = computed(() => {
    const files = this.stateService.files();
    if (files.length === 0) return '尚未選擇';
    return `已選擇 ${files.length} 個檔案`;
  });

  async handleFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const filesArray = Array.from(input.files);
    this.stateService.files.set(filesArray);
    
    // reset mode to unified when new files are uploaded
    this.stateService.toggleApplyMode('unified');
    
    const previews: string[] = [];
    
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (file.type === 'application/pdf') {
        const url = await this.renderPdfToPreview(file);
        previews.push(url);
      } else {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
        previews.push(url);
      }
    }
    
    this.stateService.filePreviews.set(previews);
    this.stateService.activeIndex.set(0);
    this.stateService.switchFile(0);
    
    // mobile scroll optimization
    if (window.innerWidth <= 768) {
      document.getElementById('previewPane')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  async renderPdfToPreview(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const c = document.createElement('canvas');
      const cx = c.getContext('2d')!;
      c.width = viewport.width;
      c.height = viewport.height;
      await page.render({ canvasContext: cx, viewport: viewport }).promise;
      return c.toDataURL('image/jpeg');
    } catch (e) {
      console.error(e);
      return this.createWhitePlaceholder(600, 800);
    }
  }

  createWhitePlaceholder(w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d')!;
    cx.fillStyle = 'white';
    cx.fillRect(0, 0, w, h);
    return c.toDataURL();
  }
}
