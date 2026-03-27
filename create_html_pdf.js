const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; padding: 40px; font-size: 18px; }
          .box { padding: 15px; margin-bottom: 20px; font-weight: bold; border-radius: 4px; }
          .pass-all { color: #000000; background-color: #f8f9fa; e: 1px solid #dee2e6; }
          .fail-all { color: #adb5bd; background-color: #ffffff; border: 1px solid #dee2e6;}
          .pd-fail { color: #D93838; background-color: #4CA64C; border: 1px solid #c3e6cb;}
          .t-fail { color: #4A88CB; background-color: #A3A35C; border: 1px solid #f5c6cb;}
          .low-vision { color: #888888; background-color: #e9ecef; border: 1px solid #ced4da; }
          
          .invoice-row { display: flex; justify-content: space-between; margin-top: 40px; font-size: 14px; }
          .invoice-dots { flex-grow: 1; border-bottom: 2px dotted #e9ecef; margin: 0 10px; position: relative; top: -5px; color: transparent; }
        </style>
      </head>
      <body>
        <h1 style="font-size: 24px;">アクセシビリティ テスト (ColorFix for All)</h1>
        <p style="color: #6c757d; font-size: 14px; margin-bottom: 30px;">
          このドキュメントは様々なパターンのコントラスト比と、ISO 24505-2基準のテストのためのサンプルです。
        </p>
        
        <div class="box pass-all">
          1. Good Contrast (WCAG Pass, ISO Pass)
        </div>
        
        <div class="box fail-all">
          2. Low Lightness (WCAG Fail, ISO Fail)
        </div>
        
        <div class="box pd-fail">
          3. Red-Green Clash (WCAG Fail, ISO Fail P/D)
        </div>
        
        <div class="box t-fail">
          4. Blue-Yellow Clash (WCAG Fail, ISO Fail T)
        </div>

        <div class="box low-vision">
          5. Low Vision Warning (WCAG Fail, ISO Fail)
        </div>

        <div class="invoice-row">
          <span>Invoice Number</span>
          <span class="invoice-dots">................................</span>
          <span>5516689921</span>
        </div>
      </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px' }
  });

  fs.writeFileSync('test.pdf', pdfBuffer);
  fs.writeFileSync('apps/web/public/dummy.pdf', pdfBuffer);

  await browser.close();
  console.log('PDF generated successfully via Puppeteer.');
})();
