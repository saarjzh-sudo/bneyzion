const { chromium } = require('/Users/srhlq/Downloads/saar-workspace/bneyzion/node_modules/playwright-core');
(async () => {
  const [url, out, w] = [process.argv[2], process.argv[3], parseInt(process.argv[4]||'1366')];
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true,
    args: ['--ignore-certificate-errors','--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'] });
  const ctx = await browser.newContext({ viewport:{width:w,height:1000}, ignoreHTTPSErrors:true });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil:'networkidle', timeout:60000 }); } catch(e){ console.error('goto warn:', e.message); }
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out, fullPage: true });
  const h = await page.evaluate(()=>document.body.scrollHeight);
  await browser.close();
  console.log('OK', out, 'height='+h);
})().catch(e=>{ console.error('ERR', e.message); process.exit(1); });
