const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <title>Accessibility Test - ColorFix for All</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #ffffff;
          --text-main: #1e293b;
          --border-color: #e2e8f0;
          --font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        body {
          font-family: var(--font-family);
          color: var(--text-main);
          background-color: var(--bg-main);
          padding: 60px;
          line-height: 1.6;
          max-width: 900px;
          margin: 0 auto;
        }
        h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.025em;
          color: #0f172a;
        }
        .subtitle {
          color: #64748b;
          font-size: 16px;
          margin-bottom: 48px;
          border-left: 4px solid #3b82f6;
          padding-left: 16px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin: 40px 0 20px;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .grid {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr;
        }
        .box {
          padding: 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.05);
          transition: transform 0.2s;
        }

        /* 1. Good Contrast */
        .pass-all { 
          color: #1e293b; 
          background-color: #f8fafc; 
          border: 1px solid #e2e8f0;
        }

        /* 2. Low Lightness (WCAG Fail) */
        .fail-all { 
          color: #94a3b8; 
          background-color: #ffffff; 
          border: 1px solid #f1f5f9;
        }

        /* 3. Red-Green Clash (P/D type NG) */
        /* Red #B91C1C on Green #2D5A27 - similar luminance for D-type */
        .pd-fail { 
          color: #B91C1C; 
          background-color: #15803D; 
        }

        /* 4. Blue-Yellow Clash (T type NG) */
        /* Blue #1E40AF on Olive/Yellow #854D0E */
        .t-fail { 
          color: #1E40AF; 
          background-color: #854D0E; 
        }

        /* 5. Natural Hard-to-see Case (Low Vision / Subtle Design) */
        .natural-hard {
          color: #71717A;
          background-color: #F4F4F5;
          border: 1px solid #E4E4E7;
          font-weight: 400;
        }

        /* Natural Design Section */
        .dashboard {
          background: #fdfdfd;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 32px;
          margin-top: 40px;
        }
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .status-dot-group {
          display: flex;
          gap: 12px;
        }
        .status-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
        }
        /* Problematic colors in a dashboard context */
        .dot-error { background-color: #DC2626; } /* Red */
        .dot-success { background-color: #16A34A; } /* Green */
        .dot-warning { background-color: #CA8A04; } /* Yellow */

        .data-row {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .data-row:last-child { border-bottom: none; }
        .data-label { flex: 1; font-size: 14px; color: #475569; }
        .data-value { font-weight: 700; color: #0f172a; }
        
        .badge {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 800;
          margin-left: 12px;
        }
        /* Natural clashing badges */
        .badge-pd { color: #FECACA; background-color: #065F46; } /* Red on Dark Green */
        .badge-t { color: #BFDBFE; background-color: #A16207; } /* Blue on Brown/Yellow */

      </style>
    </head>
    <body>
      <h1>Accessibility Test Report</h1>
      <p class="subtitle">
        このドキュメントは、ISO 24505-2基準およびWCAGに基づくアクセシビリティのコントラスト・色覚シミュレーション用のテストサンプルです。
      </p>
      
      <div class="section-title">Contrast & Color Vision Test Patterns</div>
      <div class="grid">
        <div class="box pass-all">
          1. Good Contrast (WCAG Pass, ISO Pass)
          <div style="font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px;">Standard dark text on light background. Ratio > 7:1</div>
        </div>
        
        <div class="box fail-all">
          2. Low Lightness / Low Contrast (WCAG Fail, ISO Fail)
          <div style="font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px;">Light grey on white. Hard for low vision users.</div>
        </div>
        
        <div class="box pd-fail">
          3. Red-Green Clash (NG for P/D types)
          <div style="font-size: 12px; font-weight: 400; opacity: 1.0; margin-top: 4px; color: #ffffff;">Similar luminance R/G. Distinguishable by hue only.</div>
        </div>
        
        <div class="box t-fail">
          4. Blue-Yellow Clash (NG for T type)
          <div style="font-size: 12px; font-weight: 400; opacity: 1.0; margin-top: 4px; color: #ffffff;">Blue and Yellow confusion for Tritanopia.</div>
        </div>

        <div class="box natural-hard">
          5. Subtle UI Design (Natural Case)
          <div style="font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px;">Modern "ghost" style that blends into the background for some users.</div>
        </div>
      </div>

      <div class="section-title">Natural Design Examples (Contextual Test)</div>
      <div class="dashboard">
        <div class="status-header">
          <span style="font-weight: 700;">System Health Dashboard</span>
          <div class="status-dot-group">
            <div class="status-dot dot-error" title="Critical"></div>
            <div class="status-dot dot-success" title="Healthy"></div>
            <div class="status-dot dot-warning" title="Warning"></div>
          </div>
        </div>
        
        <div class="data-row">
          <span class="data-label">API Response Time</span>
          <span class="data-value">124ms</span>
          <span class="badge badge-pd">HEARTBEAT OK</span>
        </div>
        <div class="data-row">
          <span class="data-label">Database Cluster Status</span>
          <span class="data-value">SYNCED</span>
          <span class="badge badge-t">STORAGE ACTIVE</span>
        </div>
        
        <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; font-style: italic;">
          * Note: The colored dots and badges above use color alone to convey status, which is a failure of WCAG 1.4.1.
        </p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' }
  });

  // Target files in root
  fs.writeFileSync('test.pdf', pdfBuffer);
  fs.writeFileSync('dummy.pdf', pdfBuffer);

  // Target files in web app public folder
  const publicDir = 'apps/web/public/';
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(`${publicDir}test.pdf`, pdfBuffer);
    fs.writeFileSync(`${publicDir}dummy.pdf`, pdfBuffer);
    console.log(`Updated PDFs in ${publicDir}`);
  }

  await browser.close();
  console.log('PDF generated successfully via Puppeteer.');
})();


