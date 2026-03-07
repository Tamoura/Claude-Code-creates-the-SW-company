import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, '../docs/presentation/AI-Fluency-Pitch-Deck.html');
const PDF_PATH = join(__dirname, '../docs/presentation/AI-Fluency-Pitch-Deck.pdf');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();
  console.log(`PDF generated: ${PDF_PATH}`);
}

run().catch(e => { console.error(e); process.exit(1); });
