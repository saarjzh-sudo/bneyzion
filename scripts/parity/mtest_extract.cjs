// Unified item extractor: OLD (.lessonBlock) + NEW (series/lesson links + div[role=button] dialog rows).
const { chromium } = require('/Users/srhlq/Downloads/saar-workspace/bneyzion/node_modules/playwright-core');
(async () => {
  const url = process.argv[2];
  const isNew = /vercel\.app/.test(url);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true,
    args:['--no-sandbox','--no-proxy-server','--ignore-certificate-errors','--disable-dev-shm-usage'] });
  const page = await (await browser.newContext({ignoreHTTPSErrors:true, viewport:{width:1366,height:1000}})).newPage();
  try { await page.goto(url, {waitUntil:'networkidle', timeout:60000}); } catch(e){}
  await page.waitForTimeout(isNew?5000:4000);
  const data = await page.evaluate((isNew) => {
    const norm = s => (s||'').replace(/\s+/g,' ').trim();
    const out = []; const seen = new Set();
    const push = (title, count, key) => { const k=key||title; if(title && title.length>1 && !seen.has(k)){ seen.add(k); out.push({title:title.slice(0,70), count}); } };
    if (isNew) {
      document.querySelectorAll('a[href^="/series/"], a[href^="/lessons/"]').forEach(a => {
        const t = norm(a.innerText);
        let count=null; const m=t.match(/·\s*(\d+)\s*שיעורים/); if(m) count=+m[1];
        push(t.replace(/\s*·.*$/,'').replace(/\s+הרב\s.*/,'').replace(/\s+הרבנית\s.*/,''), count, a.getAttribute('href'));
      });
      document.querySelectorAll('div[role="button"]').forEach(d => {
        let t = norm(d.innerText);
        t = t.replace(/\s*\d+:\d+\s*שעות.*$/,'').replace(/\s*\d+\s*דק.*$/,'').replace(/\s*שו"?ת\s*$/,'').trim();
        push(t, null, null);
      });
    } else {
      document.querySelectorAll('.lessonBlock').forEach(b => {
        const h=b.querySelector('h1,h2,h3,h4'); const title=h?norm(h.textContent):null;
        const au=b.querySelector('.author'); const rabbi=au?norm(au.textContent):null;
        const bt=norm(b.innerText); let count=null; const m=bt.match(/(\d+)\s*שיעורים/); if(m) count=+m[1];
        if(title) { out.push({title:title.slice(0,70), rabbi, count, isSeries:/lessonSeriesBlock/.test(b.className)}); }
      });
    }
    const h1=document.querySelector('h1');
    return { site:isNew?'new':'old', n:out.length, h1:norm(h1?h1.textContent:''), items:out };
  }, isNew);
  console.log(JSON.stringify(data));
  await browser.close();
})().catch(e=>{ console.log(JSON.stringify({error:e.message,n:0,items:[]})); });
