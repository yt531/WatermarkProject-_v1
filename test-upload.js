const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 375, height: 812, isMobile: true });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  console.log('Navigating...');
  await page.goto('http://localhost:4200');

  console.log('Uploading file...');
  const elementHandle = await page.$('input[type=file]');
  await elementHandle.uploadFile('e:\\跟ai做的程式\\WatermarkProject _v1\\src\\測試檔案\\測試用圖片_1.png');

  console.log('Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Opening fullscreen...');
  // Click the open fullscreen button
  await page.evaluate(() => {
    const btn = document.querySelector('button[class*="absolute top-2 right-2"]');
    if (btn) btn.click();
  });

  console.log('Waiting 1 second...');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Closing fullscreen...');
  // Click the close fullscreen button
  await page.evaluate(() => {
    const btn = document.querySelector('button[class*="absolute top-4 right-4"]');
    if (btn) btn.click();
  });

  console.log('Waiting 1 second...');
  await new Promise(r => setTimeout(r, 1000));

  const canvasState = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'NO_CANVAS_FOUND';
    
    // Check if canvas is actually drawn to (not blank)
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let isBlank = true;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) { // Check alpha channel
        isBlank = false;
        break;
      }
    }

    const rect = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      display: window.getComputedStyle(canvas).display,
      visibility: window.getComputedStyle(canvas).visibility,
      isBlank: isBlank
    };
  });

  console.log('Canvas state after close:', canvasState);
  await browser.close();
})();
