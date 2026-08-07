import { Component, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { WatermarkStateService, Mask } from '../../services/watermark-state.service';

@Component({
  selector: 'app-safe-zone-box',
  standalone: true,
  templateUrl: './safe-zone-box.html',
  styleUrls: ['./safe-zone-box.css']
})
export class SafeZoneBoxComponent implements OnInit {
  stateService = inject(WatermarkStateService);
  el = inject(ElementRef);

  // Local pixel state
  left = 0;
  top = 0;
  width = 150;
  height = 150;

  // Interaction state
  dragState: 'move' | 'resize' | null = null;
  resizeDir = '';
  startX = 0;
  startY = 0;
  startLeft = 0;
  startTop = 0;
  startWidth = 0;
  startHeight = 0;

  ngOnInit() {
    // initialize at 20% 20%
    const parent = this.el.nativeElement.parentElement;
    if (parent) {
      this.left = parent.clientWidth * 0.2;
      this.top = parent.clientHeight * 0.2;
    }
    this.updateStateMask();
  }

  get container() {
    return this.el.nativeElement.parentElement;
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onStart(e: MouseEvent | TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      this.dragState = 'resize';
      this.resizeDir = target.getAttribute('data-dir') || '';
    } else {
      this.dragState = 'move';
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    this.startX = clientX;
    this.startY = clientY;
    this.startLeft = this.left;
    this.startTop = this.top;
    this.startWidth = this.width;
    this.startHeight = this.height;

    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMove(e: MouseEvent | TouchEvent) {
    if (!this.dragState) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - this.startX;
    const dy = clientY - this.startY;

    const maxW = this.container.clientWidth;
    const maxH = this.container.clientHeight;

    if (this.dragState === 'move') {
      let newLeft = this.startLeft + dx;
      let newTop = this.startTop + dy;
      
      const maxLeft = maxW - this.startWidth;
      const maxTop = maxH - this.startHeight;

      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop > maxTop) newTop = maxTop;

      this.left = newLeft;
      this.top = newTop;
    } else if (this.dragState === 'resize') {
      let newW = this.startWidth;
      let newH = this.startHeight;
      let newL = this.startLeft;
      let newT = this.startTop;

      if (this.resizeDir.includes('e')) newW = this.startWidth + dx;
      if (this.resizeDir.includes('w')) {
        newW = this.startWidth - dx;
        newL = this.startLeft + dx;
      }
      if (this.resizeDir.includes('s')) newH = this.startHeight + dy;
      if (this.resizeDir.includes('n')) {
        newH = this.startHeight - dy;
        newT = this.startTop + dy;
      }

      if (newW < 20) {
        if (this.resizeDir.includes('w')) newL = this.startLeft + this.startWidth - 20;
        newW = 20;
      }
      if (newH < 20) {
        if (this.resizeDir.includes('n')) newT = this.startTop + this.startHeight - 20;
        newH = 20;
      }

      if (newL < 0) {
        newW += newL;
        newL = 0;
      }
      if (newT < 0) {
        newH += newT;
        newT = 0;
      }
      if (newL + newW > maxW) newW = maxW - newL;
      if (newT + newH > maxH) newH = maxH - newT;

      this.width = newW;
      this.height = newH;
      this.left = newL;
      this.top = newT;
    }

    if (!('touches' in e)) {
      e.preventDefault();
    }
    
    this.updateStateMask();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onEnd() {
    this.dragState = null;
  }

  updateStateMask() {
    const parent = this.container;
    if (!parent) return;

    this.stateService.safeZoneMask.set({
      x: this.left / parent.clientWidth,
      y: this.top / parent.clientHeight,
      w: this.width / parent.clientWidth,
      h: this.height / parent.clientHeight
    });
  }
}
