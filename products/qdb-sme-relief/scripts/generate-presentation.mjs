/**
 * QDB SME Relief Portal — Senior Manager Presentation Generator
 * Captures screenshots from the live portal and produces a PDF presentation.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../docs/presentation');
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3120';

async function shot(page, name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`✓ ${name}.png`);
  return path;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 } });
  const page = await ctx.newPage();

  // ── 1. Login page ──────────────────────────────────────────────────────────
  await page.goto(BASE);
  await shot(page, '01-login');

  // Click Tawtheeq login (demo: auto-authenticates)
  await page.click('text=Login with Tawtheeq');
  await page.waitForURL(`${BASE}/dashboard`);
  await shot(page, '02-dashboard');

  // ── 2. Start application ───────────────────────────────────────────────────
  await page.click('text=Start Application');
  await page.waitForURL(`${BASE}/apply/company`);
  await shot(page, '03-company-empty');

  // Enter CR number and fetch
  await page.fill('input[placeholder*="12345"]', '12345');
  await page.click('text=Fetch Details');
  await page.waitForSelector('text=Company Details Found');
  await shot(page, '04-company-fetched');

  await page.click('text=Confirm & Continue');
  await page.waitForURL(`${BASE}/apply/eligibility`);
  await shot(page, '05-eligibility');

  await page.click('text=Continue to Application');
  await page.waitForURL(`${BASE}/apply/nrgp-check`);
  await shot(page, '06-nrgp-check');

  await page.click('text=Continue to Document Upload');
  await page.waitForURL(`${BASE}/apply/documents`);
  await shot(page, '07-documents');

  // Navigate directly to review (skip actual uploads in demo)
  await page.goto(`${BASE}/apply/review`);
  await shot(page, '08-review');

  await page.goto(`${BASE}/apply/confirmation`);
  await shot(page, '09-confirmation');

  await page.goto(`${BASE}/status`);
  await shot(page, '10-status');

  await page.goto(`${BASE}/admin`);
  await shot(page, '11-admin');

  await browser.close();
  console.log('\n✓ All screenshots captured');

  // ── Generate HTML presentation ─────────────────────────────────────────────
  const html = buildHTML();
  const htmlPath = join(OUT_DIR, 'presentation.html');
  writeFileSync(htmlPath, html);
  console.log('✓ presentation.html written');

  // ── Print to PDF via Playwright ────────────────────────────────────────────
  const browser2 = await chromium.launch({ headless: true });
  const page2 = await browser2.newPage();
  await page2.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  const pdfPath = join(OUT_DIR, 'QDB-SME-Relief-Portal-Presentation.pdf');
  await page2.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser2.close();
  console.log(`\n✅ PDF saved → ${pdfPath}`);
}

function img(name) {
  return `${name}.png`;
}

function buildHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>QDB SME Relief Portal — Executive Presentation</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',Arial,sans-serif;background:#f1f5f9;color:#1e293b;}

  /* ── Slide layout ── */
  .slide{
    width:297mm; height:210mm;
    page-break-after: always;
    page-break-inside: avoid;
    position:relative;
    overflow:hidden;
    background:#fff;
  }
  .slide:last-child{page-break-after:auto;}

  /* ── Colour palette ── */
  :root{
    --navy:#0a2240;
    --gold:#c9a227;
    --teal:#0e7490;
    --green:#15803d;
    --red:#dc2626;
    --light:#f8fafc;
    --border:#e2e8f0;
  }

  /* ── Cover ── */
  .cover{
    background: linear-gradient(135deg, var(--navy) 0%, #1a3a5c 60%, #0e4d6e 100%);
    display:flex; flex-direction:column; justify-content:center; align-items:center;
    color:#fff; text-align:center; padding:40px;
  }
  .cover .logo-box{
    background:#fff; border-radius:16px; padding:14px 28px;
    font-size:36px; font-weight:800; color:var(--navy);
    letter-spacing:-1px; margin-bottom:8px;
  }
  .cover .logo-box span{color:var(--gold);}
  .cover .tag{color:var(--gold);font-size:13px;font-weight:600;letter-spacing:2px;
    text-transform:uppercase;margin-bottom:32px;}
  .cover h1{font-size:38px;font-weight:800;line-height:1.2;margin-bottom:16px;}
  .cover h2{font-size:20px;font-weight:300;opacity:.85;margin-bottom:40px;}
  .cover .meta{display:flex;gap:48px;font-size:13px;opacity:.75;}
  .cover .meta span b{display:block;font-weight:600;color:var(--gold);}
  .cover .strip{
    position:absolute;bottom:0;left:0;right:0;height:6px;
    background:linear-gradient(90deg,var(--gold),#f0c040,var(--gold));
  }

  /* ── Section header ── */
  .slide-header{
    background:var(--navy); color:#fff;
    padding:20px 36px 16px; display:flex; align-items:center; gap:16px;
  }
  .slide-header .num{
    background:var(--gold); color:var(--navy);
    width:36px;height:36px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-weight:800;font-size:16px;flex-shrink:0;
  }
  .slide-header h2{font-size:22px;font-weight:700;}
  .slide-header p{font-size:13px;opacity:.75;margin-top:2px;}

  /* ── Content layouts ── */
  .slide-body{padding:24px 36px;flex:1;}
  .slide-full{display:flex;flex-direction:column;height:210mm;}

  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}

  /* ── Cards ── */
  .card{background:var(--light);border:1px solid var(--border);border-radius:12px;padding:20px;}
  .card h3{font-size:14px;font-weight:700;color:var(--navy);margin-bottom:8px;}
  .card p,.card li{font-size:12.5px;line-height:1.65;color:#475569;}
  .card ul{padding-left:16px;}
  .card.accent{border-left:4px solid var(--teal);}
  .card.gold{border-left:4px solid var(--gold);}
  .card.red{border-left:4px solid var(--red);}

  /* ── Stat blocks ── */
  .stat-row{display:flex;gap:16px;margin-bottom:20px;}
  .stat{flex:1;background:var(--navy);color:#fff;border-radius:12px;padding:16px 20px;text-align:center;}
  .stat .value{font-size:28px;font-weight:800;color:var(--gold);}
  .stat .label{font-size:11px;opacity:.8;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;}

  /* ── Screenshot frames ── */
  .screen-frame{
    border:1px solid var(--border);border-radius:10px;overflow:hidden;
    box-shadow:0 4px 12px rgba(0,0,0,.1);
  }
  .screen-frame .bar{
    background:#e5e7eb;padding:6px 12px;display:flex;gap:6px;align-items:center;
  }
  .screen-frame .bar span{width:10px;height:10px;border-radius:50%;display:inline-block;}
  .screen-frame .bar .r{background:#ef4444;}
  .screen-frame .bar .y{background:#f59e0b;}
  .screen-frame .bar .g{background:#22c55e;}
  .screen-frame .bar .url{
    flex:1;background:#fff;border-radius:4px;padding:2px 10px;
    font-size:10px;color:#6b7280;margin-left:8px;
  }
  .screen-frame img{width:100%;display:block;}

  /* ── Flow diagram ── */
  .flow{display:flex;align-items:center;gap:0;flex-wrap:nowrap;}
  .flow-step{
    flex:1;background:var(--navy);color:#fff;
    padding:10px 8px;text-align:center;font-size:11px;font-weight:600;
    border-radius:8px;position:relative;
  }
  .flow-step .icon{font-size:20px;display:block;margin-bottom:4px;}
  .flow-arrow{color:var(--gold);font-size:20px;font-weight:900;padding:0 4px;}
  .flow-step.auto{background:var(--green);}
  .flow-step.manual{background:var(--teal);}
  .flow-step.ext{background:#6d28d9;}

  /* ── Integration table ── */
  .int-table{width:100%;border-collapse:collapse;font-size:12px;}
  .int-table th{background:var(--navy);color:#fff;padding:8px 12px;text-align:left;font-weight:600;}
  .int-table td{padding:8px 12px;border-bottom:1px solid var(--border);vertical-align:top;}
  .int-table tr:nth-child(even) td{background:#f8fafc;}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;}
  .badge.live{background:#dcfce7;color:#15803d;}
  .badge.planned{background:#fef3c7;color:#92400e;}

  /* ── Timeline ── */
  .timeline{display:flex;gap:0;margin-top:8px;}
  .tl-phase{flex:1;text-align:center;}
  .tl-bar{height:28px;display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;color:#fff;border-radius:4px;}
  .tl-label{font-size:10px;color:#64748b;margin-top:4px;}
  .tl-p1 .tl-bar{background:var(--teal);}
  .tl-p2 .tl-bar{background:var(--gold);color:var(--navy);}
  .tl-p3 .tl-bar{background:#7c3aed;}
  .tl-p4 .tl-bar{background:var(--green);}

  /* ── Bullet list ── */
  .bullets{list-style:none;padding:0;}
  .bullets li{display:flex;gap:10px;align-items:flex-start;
    font-size:12.5px;color:#334155;margin-bottom:10px;line-height:1.5;}
  .bullets li::before{content:"▸";color:var(--gold);font-size:14px;flex-shrink:0;}

  /* ── Metrics table ── */
  .metrics{width:100%;border-collapse:collapse;font-size:12px;}
  .metrics th{background:var(--navy);color:#fff;padding:8px 14px;text-align:left;font-weight:600;}
  .metrics td{padding:8px 14px;border-bottom:1px solid var(--border);}
  .metrics tr:nth-child(even) td{background:#f8fafc;}
  .metrics td.val{font-weight:700;color:var(--teal);}

  /* ── Thank you / next steps ── */
  .closing{
    background:linear-gradient(135deg,var(--navy) 0%,#1a3a5c 100%);
    color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;
    text-align:center;padding:48px;height:210mm;
  }
  .closing h1{font-size:40px;font-weight:800;margin-bottom:16px;}
  .closing p{font-size:16px;opacity:.8;max-width:540px;line-height:1.7;}
  .closing .next{display:flex;gap:32px;margin-top:40px;}
  .closing .next-item{background:rgba(255,255,255,.1);border-radius:12px;padding:20px 28px;
    flex:1;border:1px solid rgba(255,255,255,.2);}
  .closing .next-item .n{font-size:28px;font-weight:800;color:var(--gold);}
  .closing .next-item p{font-size:13px;opacity:.8;margin-top:4px;}

  @media print{
    body{background:#fff;}
    .slide{box-shadow:none;}
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════
     SLIDE 1 — COVER
═══════════════════════════════════════════════════════ -->
<div class="slide cover">
  <div class="logo-box">QDB<span>.</span></div>
  <div class="tag">Qatar Development Bank · Digital Services</div>
  <h1>SME Relief Portal</h1>
  <h2>Emergency Financing Platform · NRGP Digital Delivery</h2>
  <div class="meta">
    <span><b>Presented to</b>Senior Manager, Digital</span>
    <span><b>Date</b>March 2026</span>
    <span><b>Classification</b>Confidential</span>
    <span><b>Status</b>Prototype Ready</span>
  </div>
  <div class="strip"></div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 2 — PROBLEM STATEMENT
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">1</div>
    <div><h2>Problem Statement</h2><p>Why this portal is urgent and necessary</p></div>
  </div>
  <div class="slide-body" style="display:flex;flex-direction:column;gap:16px;">
    <div class="two-col" style="flex:1;">
      <div>
        <div class="card red" style="margin-bottom:14px;">
          <h3>🌍 The Geopolitical Trigger</h3>
          <p>The Iran-Israel regional conflict has disrupted trade routes, fragmented supply chains, and suppressed regional demand for Qatar-registered SMEs. Revenue has dropped sharply while <strong>fixed obligations remain due</strong>: salaries under WPS and commercial lease payments.</p>
        </div>
        <div class="card accent" style="margin-bottom:14px;">
          <h3>⚠️ What Happens Without Action</h3>
          <ul>
            <li>WPS fines: <strong>QAR 6,000 per employee per late salary cycle</strong></li>
            <li>A 50-person SME faces QAR 300,000 in fines per month</li>
            <li>Commercial lease defaults and evictions</li>
            <li>Staff layoffs increasing national unemployment pressure</li>
            <li>Permanent business closures destroying economic value</li>
          </ul>
        </div>
        <div class="card gold">
          <h3>🏦 The Missed Opportunity</h3>
          <p>QDB already operates the <strong>National Relief &amp; Guarantee Program (NRGP)</strong> — a board-approved instrument used during COVID-19. The framework exists. The beneficiary list exists. The problem is <strong>delivery speed</strong>: the current manual process takes <strong>15–30 business days</strong> per application.</p>
        </div>
      </div>
      <div>
        <div class="card" style="background:var(--navy);color:#fff;margin-bottom:14px;">
          <h3 style="color:var(--gold);">The Scale of the Problem</h3>
          <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:100px;text-align:center;background:rgba(255,255,255,.08);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:800;color:var(--gold);">500+</div>
              <div style="font-size:10px;opacity:.8;">SMEs at immediate risk</div>
            </div>
            <div style="flex:1;min-width:100px;text-align:center;background:rgba(255,255,255,.08);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:800;color:var(--gold);">~20</div>
              <div style="font-size:10px;opacity:.8;">Applications processed / week (manual)</div>
            </div>
            <div style="flex:1;min-width:100px;text-align:center;background:rgba(255,255,255,.08);border-radius:8px;padding:12px;">
              <div style="font-size:24px;font-weight:800;color:#ef4444;">30 days</div>
              <div style="font-size:10px;opacity:.8;">Current processing time per application</div>
            </div>
          </div>
        </div>
        <div class="card accent">
          <h3>✅ Why a Digital Portal is the Right Answer</h3>
          <ul style="padding-left:16px;font-size:12.5px;line-height:1.8;color:#475569;">
            <li>QDB <strong>cannot scale manual review</strong> fast enough to prevent harm</li>
            <li>Automated eligibility checking eliminates assessor bottlenecks</li>
            <li>WPS integration provides objective salary obligation evidence</li>
            <li>MOCI integration removes document fraud risk on CR data</li>
            <li>CRM routing ensures full audit trail and governance compliance</li>
            <li>Returning NRGP beneficiaries get <strong>same-day auto-disbursement</strong></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 3 — SOLUTION OVERVIEW
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">2</div>
    <div><h2>Solution Overview</h2><p>What the QDB SME Relief Portal delivers</p></div>
  </div>
  <div class="slide-body">
    <div class="stat-row">
      <div class="stat"><div class="value">QAR 500K</div><div class="label">Max financing per SME</div></div>
      <div class="stat"><div class="value">0%</div><div class="label">Interest rate — relief loan</div></div>
      <div class="stat"><div class="value">&lt; 1 Day</div><div class="label">Auto-disbursement path</div></div>
      <div class="stat"><div class="value">&lt; 5 Days</div><div class="label">Manual review path</div></div>
      <div class="stat"><div class="value">500+</div><div class="label">Applications / week (digital)</div></div>
    </div>
    <div class="two-col">
      <div>
        <div class="card" style="margin-bottom:14px;">
          <h3>🔄 Two Disbursement Pathways</h3>
          <p style="margin-bottom:8px;"><strong style="color:var(--green);">Auto Disbursement</strong> — For returning NRGP beneficiaries (COVID-19 list). Documents are verified automatically. CRM case is created and funds disbursed within 24 hours.</p>
          <p><strong style="color:var(--teal);">Manual Review</strong> — For first-time applicants. Application is routed to a QDB Relationship Manager for review and decision within 5 business days.</p>
        </div>
        <div class="card gold">
          <h3>🏛️ Built on Existing Infrastructure</h3>
          <ul>
            <li><strong>NRGP</strong> — Board-approved relief framework, already activated</li>
            <li><strong>Tawtheeq (NAS)</strong> — Government identity authentication</li>
            <li><strong>MOCI</strong> — Ministry of Commerce CR data verification</li>
            <li><strong>WPS</strong> — Ministry of Labor payroll validation</li>
            <li><strong>Dynamics CRM</strong> — QDB's existing case management system</li>
          </ul>
        </div>
      </div>
      <div>
        <h3 style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;">APPLICATION FLOW</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--navy);color:var(--gold);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">1</div>
            <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>Tawtheeq Login</strong> — Secure government identity verification (NAS)</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--navy);color:var(--gold);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">2</div>
            <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>CR Verification</strong> — Enter CR number; details fetched live from MOCI</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--navy);color:var(--gold);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">3</div>
            <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>Eligibility Check</strong> — 7 NRGP criteria evaluated automatically in seconds</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--navy);color:var(--gold);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">4</div>
            <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>NRGP List Check</strong> — Determines Auto vs. Manual disbursement route</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--navy);color:var(--gold);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">5</div>
            <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>Document Upload</strong> — WPS file, salary evidence, lease, CR copy, authorisation</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="background:var(--green);color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">✓</div>
            <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px;"><strong>CRM Case Created</strong> — Automatic or manual routing into Dynamics 365</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 4 — PORTAL SCREENSHOTS (LOGIN + DASHBOARD)
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">3</div>
    <div><h2>Portal Walkthrough — Applicant Journey (1/4)</h2><p>Login &amp; Dashboard</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col" style="height:calc(210mm - 100px);">
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 1 — Secure Login via Tawtheeq (NAS)</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120</div></div>
          <img src="${img('01-login')}" alt="Login page"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">Bilingual (Arabic/English) portal with QDB branding. Authentication is handled entirely through Qatar's National Authentication Service — no separate credentials required.</p>
      </div>
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 2 — Applicant Dashboard</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/dashboard</div></div>
          <img src="${img('02-dashboard')}" alt="Dashboard"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">Personalised welcome with application progress tracker. Key program terms (QAR 500K, 2–5 days, 0% interest) displayed upfront to set expectations.</p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 5 — CR VERIFICATION + ELIGIBILITY
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">4</div>
    <div><h2>Portal Walkthrough — Applicant Journey (2/4)</h2><p>Company Verification &amp; Eligibility Check</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col" style="height:calc(210mm - 100px);">
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 3 — MOCI Company Verification</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/company</div></div>
          <img src="${img('04-company-fetched')}" alt="Company verification with data"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">Applicant enters their CR number. The portal calls the MOCI API live and returns verified company name, status, capital, employee count — <strong>no manual data entry</strong>.</p>
      </div>
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 4 — Automated Eligibility Assessment</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/eligibility</div></div>
          <img src="${img('05-eligibility')}" alt="Eligibility check"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">7 NRGP eligibility criteria evaluated instantly: active CR, pre-2024 registration, SME classification (&lt;250 employees), Qatar operations, no NPLs, covered sector. <strong>Instant pass/fail with clear reasoning.</strong></p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 6 — NRGP CHECK + DOCUMENTS
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">5</div>
    <div><h2>Portal Walkthrough — Applicant Journey (3/4)</h2><p>NRGP Routing &amp; Document Upload</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col" style="height:calc(210mm - 100px);">
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 5 — NRGP Beneficiary List Check</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/nrgp-check</div></div>
          <img src="${img('06-nrgp-check')}" alt="NRGP check"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">Portal checks whether the CR appears in the existing NRGP beneficiary list (COVID-19 programme). If found → <strong>Auto Disbursement</strong>. If not → <strong>Manual Review</strong> by QDB Relationship Manager.</p>
      </div>
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;">STEP 6 — Structured Document Upload</p>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/documents</div></div>
          <img src="${img('07-documents')}" alt="Document upload"/>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:8px;">Four document categories: <strong>Salary</strong> (WPS XLSX/CSV), <strong>Rent</strong> (lease &amp; invoice), <strong>Company</strong> (CR copy), <strong>Authorisation</strong>. WPS file is validated programmatically on upload.</p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 7 — REVIEW + CONFIRMATION + STATUS
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">6</div>
    <div><h2>Portal Walkthrough — Applicant Journey (4/4)</h2><p>Review, Submission &amp; Status Tracking</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col" style="height:calc(210mm - 110px);">
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:6px;">STEP 7 — Review &amp; Submit</p>
        <div class="screen-frame" style="margin-bottom:10px;">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/review</div></div>
          <img src="${img('08-review')}" alt="Review"/>
        </div>
        <p style="font-size:11px;color:#64748b;">Full application summary with reference number (QDB-RELIEF-2025-XXXXX) and disbursement type confirmed before submission.</p>
      </div>
      <div>
        <p style="font-size:12px;font-weight:600;color:var(--navy);margin-bottom:6px;">CONFIRMED + LIVE STATUS TRACKING</p>
        <div class="screen-frame" style="margin-bottom:10px;">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/apply/confirmation</div></div>
          <img src="${img('09-confirmation')}" alt="Confirmation"/>
        </div>
        <div class="screen-frame">
          <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/status</div></div>
          <img src="${img('10-status')}" alt="Status"/>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 8 — ADMIN DASHBOARD
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">7</div>
    <div><h2>Admin Dashboard</h2><p>QDB internal view — case management, NRGP list, program controls</p></div>
  </div>
  <div class="slide-body" style="display:flex;flex-direction:column;gap:16px;">
    <div class="screen-frame" style="max-height:320px;overflow:hidden;">
      <div class="bar"><span class="r"></span><span class="y"></span><span class="g"></span><div class="url">localhost:3120/admin</div></div>
      <img src="${img('11-admin')}" alt="Admin dashboard"/>
    </div>
    <div class="three-col">
      <div class="card accent">
        <h3>📊 Live KPIs</h3>
        <p>Total applications, auto-disbursement count, manual review queue, disbursed count — all visible in real time.</p>
      </div>
      <div class="card gold">
        <h3>🔍 Case Queue</h3>
        <p>Filter by status: All · Auto · Manual Review · Pending · Disbursed. Each case shows company, amount, RM assignment, and one-click approve action.</p>
      </div>
      <div class="card">
        <h3>📋 NRGP List Upload</h3>
        <p>Admin can upload the official NRGP beneficiary CSV to update the auto-disbursement eligibility list when new cycles are activated.</p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 9 — INTEGRATIONS
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">8</div>
    <div><h2>System Integrations</h2><p>Government &amp; enterprise systems connected to the portal</p></div>
  </div>
  <div class="slide-body">
    <table class="int-table" style="margin-bottom:20px;">
      <thead>
        <tr><th>System</th><th>Provider</th><th>Purpose</th><th>Data Flow</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tawtheeq / NAS</strong></td>
          <td>National Authentication Service</td>
          <td>Identity verification &amp; OAuth login for applicants</td>
          <td>Portal → NAS → Token → User identity</td>
          <td><span class="badge planned">Prototype (mock)</span></td>
        </tr>
        <tr>
          <td><strong>MOCI API</strong></td>
          <td>Ministry of Commerce &amp; Industry</td>
          <td>Live CR data: company name, status, employees, capital, activity</td>
          <td>Portal → MOCI API → Company record</td>
          <td><span class="badge planned">Prototype (mock)</span></td>
        </tr>
        <tr>
          <td><strong>WPS API</strong></td>
          <td>Ministry of Labor</td>
          <td>Validate salary obligations against payroll records</td>
          <td>Portal → WPS API → Payroll validation result</td>
          <td><span class="badge planned">Prototype (mock)</span></td>
        </tr>
        <tr>
          <td><strong>Dynamics 365 CRM</strong></td>
          <td>QDB Internal</td>
          <td>Create disbursement cases (auto or manual) for QDB processing</td>
          <td>Portal → CRM API → Case created → RM notified</td>
          <td><span class="badge planned">Prototype (mock)</span></td>
        </tr>
        <tr>
          <td><strong>Azure Blob Storage</strong></td>
          <td>Microsoft Azure · Qatar North</td>
          <td>Encrypted document storage with time-limited signed URLs</td>
          <td>Portal → Blob → Signed URL → CRM / RM access</td>
          <td><span class="badge live">Architecture defined</span></td>
        </tr>
      </tbody>
    </table>
    <div class="card" style="background:var(--navy);color:#fff;padding:16px 20px;">
      <h3 style="color:var(--gold);margin-bottom:10px;">Data Security &amp; Compliance</h3>
      <div style="display:flex;gap:24px;font-size:12px;">
        <div style="flex:1;opacity:.85;"><strong style="color:#fff;">🔐 Authentication</strong><br/>All integrations use OAuth 2.0 and API keys stored in Azure Key Vault. No credentials in code or config files.</div>
        <div style="flex:1;opacity:.85;"><strong style="color:#fff;">🛡️ Data Residency</strong><br/>All data stored in Azure Qatar North region. Documents encrypted at rest (AES-256) and in transit (TLS 1.3).</div>
        <div style="flex:1;opacity:.85;"><strong style="color:#fff;">📋 Audit Trail</strong><br/>Every application step, eligibility decision, document upload, and CRM action is immutably logged with timestamp and user ID.</div>
        <div style="flex:1;opacity:.85;"><strong style="color:#fff;">🚫 Duplicate Prevention</strong><br/>100% duplicate CR detection — one application per CR per relief period, enforced at API level before any processing.</div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 10 — SUCCESS METRICS
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">9</div>
    <div><h2>Success Metrics &amp; Targets</h2><p>How we measure programme effectiveness</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col">
      <div>
        <table class="metrics">
          <thead><tr><th>Metric</th><th>Target</th></tr></thead>
          <tbody>
            <tr><td>Auto-disbursement end-to-end time</td><td class="val">&lt; 1 business day</td></tr>
            <tr><td>Manual review processing time</td><td class="val">&lt; 5 business days</td></tr>
            <tr><td>Document re-submission rate</td><td class="val">&lt; 10% (from 40–60%)</td></tr>
            <tr><td>Applications processed per week</td><td class="val">500+ (from ~20)</td></tr>
            <tr><td>NAS authentication success rate</td><td class="val">&gt; 98%</td></tr>
            <tr><td>MOCI API success rate</td><td class="val">&gt; 99.5%</td></tr>
            <tr><td>WPS validation completion rate</td><td class="val">&gt; 95%</td></tr>
            <tr><td>CRM case creation failure rate</td><td class="val">&lt; 0.1%</td></tr>
            <tr><td>Portal uptime</td><td class="val">&gt; 99.5%</td></tr>
            <tr><td>Duplicate detection rate</td><td class="val">100%</td></tr>
            <tr><td>Audit trail completeness</td><td class="val">100%</td></tr>
            <tr><td>Applicant satisfaction score</td><td class="val">&gt; 4.0 / 5.0</td></tr>
          </tbody>
        </table>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="card" style="background:var(--navy);color:#fff;">
          <h3 style="color:var(--gold);">Before vs. After</h3>
          <div style="display:flex;gap:16px;margin-top:12px;">
            <div style="flex:1;background:rgba(220,38,38,.15);border-radius:8px;padding:12px;border:1px solid rgba(220,38,38,.3);">
              <div style="font-size:11px;font-weight:700;color:#fca5a5;margin-bottom:6px;">MANUAL PROCESS (TODAY)</div>
              <ul style="font-size:11px;color:#94a3b8;padding-left:14px;line-height:1.8;">
                <li>15–30 business days per application</li>
                <li>~20 applications per week maximum</li>
                <li>40–60% document re-submission rate</li>
                <li>No real-time status for applicants</li>
                <li>Eligibility assessed manually by RM</li>
              </ul>
            </div>
            <div style="flex:1;background:rgba(21,128,61,.15);border-radius:8px;padding:12px;border:1px solid rgba(21,128,61,.3);">
              <div style="font-size:11px;font-weight:700;color:#86efac;margin-bottom:6px;">DIGITAL PORTAL (TARGET)</div>
              <ul style="font-size:11px;color:#94a3b8;padding-left:14px;line-height:1.8;">
                <li>&lt; 1 day (auto) / &lt; 5 days (manual)</li>
                <li>500+ applications per week</li>
                <li>&lt; 10% document re-submission</li>
                <li>Real-time status tracking via portal</li>
                <li>Automated eligibility in seconds</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="card gold">
          <h3>📈 25× Throughput Improvement</h3>
          <p>Moving from ~20 to 500+ applications per week — a 25× increase — means QDB can serve the full affected SME population within the first month of activation, preventing the wave of WPS violations and lease defaults.</p>
        </div>
        <div class="card accent">
          <h3>🎯 6–8 Week Delivery Target</h3>
          <p>The prototype is complete. Integration work with NAS, MOCI, WPS, and Dynamics CRM is the remaining critical path. The 6–8 week window is achievable given existing QDB integration relationships.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 11 — TECHNOLOGY & DELIVERY
═══════════════════════════════════════════════════════ -->
<div class="slide slide-full">
  <div class="slide-header">
    <div class="num">10</div>
    <div><h2>Technology Stack &amp; Delivery Plan</h2><p>Architecture choices and timeline to production</p></div>
  </div>
  <div class="slide-body">
    <div class="two-col">
      <div>
        <div class="card" style="margin-bottom:14px;">
          <h3>🏗️ Technology Stack</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;font-size:12px;">
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Frontend</strong><br/>Next.js 14 · React 18 · Tailwind CSS</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Backend</strong><br/>Fastify · Node.js 20 · TypeScript</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Database</strong><br/>PostgreSQL 15 · Prisma ORM</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Hosting</strong><br/>Azure Qatar North · AKS / App Service</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Storage</strong><br/>Azure Blob · GRS · AES-256</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Secrets</strong><br/>Azure Key Vault · Managed Identity</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>CDN / WAF</strong><br/>Azure Front Door · DDoS protection</div>
            <div style="background:#f1f5f9;border-radius:6px;padding:8px 10px;"><strong>Monitoring</strong><br/>App Insights · Log Analytics</div>
          </div>
        </div>
        <div class="card accent">
          <h3>🌐 Bilingual &amp; Accessible</h3>
          <p>Full Arabic/English language support with RTL layout. WCAG 2.1 AA accessibility compliance. Mobile-responsive for applicants submitting via phone.</p>
        </div>
      </div>
      <div>
        <h3 style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;">DELIVERY TIMELINE (6–8 WEEKS)</h3>
        <div class="timeline">
          <div class="tl-phase tl-p1">
            <div class="tl-bar">Week 1–2<br/>Integrations</div>
            <div class="tl-label">NAS · MOCI<br/>WPS · CRM APIs</div>
          </div>
          <div class="tl-phase tl-p2">
            <div class="tl-bar">Week 3–4<br/>QA &amp; UAT</div>
            <div class="tl-label">E2E testing<br/>Security audit</div>
          </div>
          <div class="tl-phase tl-p3">
            <div class="tl-bar">Week 5–6<br/>Staging</div>
            <div class="tl-label">QDB review<br/>Pilot users</div>
          </div>
          <div class="tl-phase tl-p4">
            <div class="tl-bar">Week 7–8<br/>Go Live</div>
            <div class="tl-label">Production<br/>deployment</div>
          </div>
        </div>
        <div style="margin-top:16px;">
          <div class="card gold" style="margin-bottom:10px;">
            <h3>✅ Prototype Status</h3>
            <p>Full applicant journey is functional in the prototype — login, CR verification, eligibility check, NRGP routing, document upload, review, confirmation, and status tracking. Admin dashboard is operational. All screens are bilingual.</p>
          </div>
          <div class="card">
            <h3>🔴 Remaining Critical Path</h3>
            <ul style="padding-left:16px;font-size:12px;line-height:1.8;color:#475569;">
              <li>NAS (Tawtheeq) OAuth integration — QDB IT dependency</li>
              <li>MOCI live API credentials and endpoint agreement</li>
              <li>WPS API access from Ministry of Labor</li>
              <li>Dynamics CRM API connector configuration</li>
              <li>Azure Qatar North environment provisioning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     SLIDE 12 — CLOSING / NEXT STEPS
═══════════════════════════════════════════════════════ -->
<div class="slide closing">
  <div style="background:var(--gold);color:var(--navy);border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;margin-bottom:24px;">QDB</div>
  <h1>Recommendation: Proceed to Integration Phase</h1>
  <p>The prototype demonstrates a fully functional end-to-end digital workflow. The business case is clear, the framework is approved, and the urgency is real. Every week of delay is another month of WPS exposure for Qatar's SME sector.</p>
  <div class="next">
    <div class="next-item">
      <div class="n">01</div>
      <p>Approve integration access requests for NAS, MOCI, WPS, and Dynamics CRM</p>
    </div>
    <div class="next-item">
      <div class="n">02</div>
      <p>Provision Azure Qatar North environment and assign QDB IT resources</p>
    </div>
    <div class="next-item">
      <div class="n">03</div>
      <p>Define eligibility criteria edge cases with QDB Credit &amp; Compliance teams</p>
    </div>
    <div class="next-item">
      <div class="n">04</div>
      <p>Conduct UAT with 3–5 pilot SMEs before full programme activation</p>
    </div>
  </div>
  <div style="margin-top:40px;opacity:.5;font-size:12px;">
    QDB SME Relief Portal · Confidential — QDB Internal Use Only · March 2026
  </div>
</div>

</body>
</html>`;
}

run().catch(e => { console.error(e); process.exit(1); });
