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
    if (files.length === 0) return 'å°šæœª?¸æ?';
    return `å·²é¸??${files.length} ?‹æ?æ¡ˆ`;
  });

  async handleFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const filesArray = Array.from(input.files);
    this.stateService.files.set(filesArray);
    
    const firstFile = filesArray[0];
    if (firstFile.type === 'application/pdf') {
      await this.renderPdfToPreview(firstFile);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          this.stateService.previewImageSrc.set(e.target.result as string);
        }
      };
      reader.readAsDataURL(firstFile);
    }
    
    // mobile scroll optimization
    if (window.innerWidth <= 768) {
      document.getElementById('previewPane')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  async renderPdfToPreview(file: File) {
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
      this.stateService.previewImageSrc.set(c.toDataURL('image/jpeg'));
    } catch (e) {
      console.error(e);
      this.stateService.previewImageSrc.set(this.createWhitePlaceholder(600, 800));
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
