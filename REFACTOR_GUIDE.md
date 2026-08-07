# 專案重構規範：Angular v22 + Tailwind v4.3

## 1. Tailwind CSS v4.3 規範
- **CSS-First 架構**：絕對不要生成、保留或修改 `tailwind.config.js`。
- **主題變數設定**：所有自定義顏色、字體與斷點，一律在全域樣式檔（如 `styles.css` 或 `styles.scss`）中使用 `@theme` 區塊語法進行設定。
- **Utility Classes**：請使用 Tailwind v4.3 的最新寫法，自動替換掉 v3 時代已棄用的類別。

## 2. Angular v22 規範
- **Standalone Components**：全面採用獨立組件架構，不使用 `NgModules`。
- **Signals 與狀態管理**：優先使用 Angular Signals API（`signal`, `computed`, `effect`）來處理狀態，取代舊版的 RxJS 複雜訂閱模式（除非涉及複雜異步流）。
- **現代控制流（Control Flow）**：視圖範本中請嚴格使用新的內建控制流語法（如 `@if`, `@for`, `@switch`），汰除舊有的 `*ngIf` 與 `*ngFor`。
- **生命週期**：採用最新的 Signal-based 生命週期或函數式 API。

## 3. 若對最新語法有任何不確定，請務必即時查閱官方文件
- **Tailwind CSS 文件**：https://tailwindcss.com/docs
- **Angular 文件**：https://angular.dev/guide
- **請確保輸出的程式碼完全符合這兩個版本的最新規範**