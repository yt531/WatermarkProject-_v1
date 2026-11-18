import { Component, input, model } from '@angular/core';

export interface SubTab {
  id: string;
  label: string;
}

/** 面板內的子標籤列（僅手機版顯示）：一次只顯示一個區塊，讓下方功能區不必捲動 */
@Component({
  selector: 'app-sub-tabs',
  standalone: true,
  host: { class: 'md:hidden block' },
  template: `
    <div class="flex bg-[#eee] rounded p-[2px]" role="tablist">
      @for (tab of tabs(); track tab.id) {
      <button
        role="tab"
        [attr.aria-selected]="active() === tab.id"
        (click)="active.set(tab.id)"
        class="flex-1 min-h-[44px] border-none cursor-pointer text-[14px] transition-colors"
        [class]="active() === tab.id
          ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-sm font-bold text-(--color-primary)'
          : 'bg-transparent text-[#555]'">
        {{ tab.label }}
      </button>
      }
    </div>
  `,
})
export class SubTabsComponent {
  tabs = input.required<SubTab[]>();
  active = model.required<string>();
}
