// Actual S-09 flow, fictional fixtures only. No external network requests allowed.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.QA_BASE ?? 'http://127.0.0.1:5187', output = process.env.QA_OUTPUT ?? 'qa/desk-settlement';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const checks = [], errors = []; let active;
try {
  for (const lang of ['en', 'es']) {
    const en = lang === 'en', context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, request => request.abort());
    await context.addInitScript(lang => { if (sessionStorage.getItem('desk-init')) return; sessionStorage.setItem('desk-init', '1'); localStorage.setItem('hoyos.lang', lang); localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'light', skin: 'styled' })); localStorage.setItem('hoyos.session', JSON.stringify({ userId: 'usr_desk', viewAs: null, devMode: false })); }, lang);
    const page = await context.newPage(); active = page; page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/#/staff/transfers`); await page.getByRole('heading', { name: en ? 'Pending demo payments' : 'Pagos demo pendientes', exact: true }).waitFor();
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('hoyos.db.v1')), db = stored.db, now = new Date().toISOString();
      const common = { tenant_id: 'ten_hoy', created_at: now, updated_at: now };
      db.payments = []; db.transfer_receipts = []; db.class_ledger = db.class_ledger.filter(r => r.user_id !== 'usr_cust'); db.bookings = db.bookings.filter(r => r.user_id !== 'usr_cust');
      const quote = { snapshotVersion: 1, tenantId: 'ten_hoy', itemId: 'pack12', productId: 'plan_pack12', planId: 'plan_pack12', code: 'QA_FROZEN', name: { es: 'Paquete FICTICIO retenido', en: 'FICTIONAL retained package' }, amount: 123000, currency: 'COP', purchaseDate: now.slice(0, 10), classes: 14, validityDays: 75, catalogRevision: 3, priceId: 'fictional', source: 'local_publication', kind: 'class', sourceKey: 'fictional-retained-terms', quantity: 1, chargedAmount: 123000, fallbackValidityDays: 90, entitlementExpiresAt: '2099-01-05' };
      const payment = { ...common, id: 'qa_desk', user_id: 'usr_cust', plan_id: 'plan_pack12', amount: 123000, amount_paid: null, currency: 'COP', method: 'cash', provider: 'manual', status: 'pending', paid_at: null, note: null, frontend_quote: quote };
      db.payments.push(payment, { ...payment, id: 'qa_historical', frontend_quote: undefined });
      localStorage.setItem('hoyos.db.v1', JSON.stringify(stored));
    });
    await page.reload();
    await page.goto(`${base}/#/staff/transfers?payment=qa_historical`);
    await page.getByText(en ? 'Cannot confirm here: retained purchase terms are missing or this is not a supported demo front-desk request. Keep it pending for review.' : 'No se puede confirmar aquí: faltan términos de compra retenidos o la solicitud no es un pago demo compatible de recepción. Conserva el pendiente para revisión.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').locator('input').count(), 0);
    await page.goto(`${base}/#/staff/transfers?payment=qa_desk`);
    const dialog = page.getByRole('dialog'), button = () => dialog.getByRole('button', { name: en ? 'Confirm demo collection' : 'Confirmar cobro demo', exact: true });
    const amount = () => dialog.getByLabel(en ? 'Amount received (COP)' : 'Monto recibido (COP)', { exact: true });
    const note = () => dialog.getByLabel(en ? 'Fictional front-desk reference or note' : 'Referencia o nota ficticia de recepción', { exact: true });
    const ack = () => dialog.getByLabel(en ? 'I verified the fictional collection for the exact total.' : 'Verifiqué el cobro ficticio por el total exacto.', { exact: true });
    await button().waitFor(); assert(await button().isDisabled());
    await amount().fill('122999'); await note().fill('FICTIONAL collection'); await ack().check(); assert(await button().isDisabled());
    await amount().fill('123001'); assert(await button().isDisabled()); await amount().fill('123000'); assert(await button().isEnabled());
    async function capture(label) {
      for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${lang} ${width}: viewport overflow`);
        assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${lang} ${width}: dialog overflow`);
        await dialog.locator('.drawer-body').evaluate(el => { el.scrollTop = 0; });
        await page.screenshot({ path: `${output}/${lang}-${width}-${label}.jpg`, fullPage: true, quality: 72 });
        await dialog.locator('.drawer-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
        await page.screenshot({ path: `${output}/${lang}-${width}-${label}-controls.jpg`, fullPage: true, quality: 72 });
      }
    }
    await capture('ready-light');
    const beforeCancel = await page.evaluate(() => localStorage.getItem('hoyos.db.v1'));
    await dialog.getByRole('button', { name: en ? 'Close' : 'Cerrar', exact: true }).last().click();
    assert.equal(await page.evaluate(() => localStorage.getItem('hoyos.db.v1')), beforeCancel);
    await page.goto(`${base}/#/staff/transfers?payment=qa_desk`); await button().waitFor(); assert(await button().isDisabled());
    await amount().fill('123000'); await note().fill('FICTIONAL collection'); await ack().check();
    await dialog.getByRole('combobox', { name: en ? /^Method received at the desk/ : /^Método recibido en recepción/ }).selectOption('card');
    await page.evaluate(() => { window.qaStore = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === 'hoyos.db.v1') throw Error('FICTIONAL quota failure'); return window.qaStore.call(this, k, v); }; });
    await button().click(); await page.getByText(en ? 'The local outcome could not be confirmed. It may already be saved; retry with the same details. Expired terms, changed requests and payments with linked receipts cannot be confirmed here.' : 'No se confirmó el resultado local. Podría estar guardado; reintenta con los mismos datos. No se confirman términos vencidos, solicitudes modificadas ni pagos con comprobante vinculado.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('hoyos.db.v1')), beforeCancel);
    await capture('error-light');
    await page.evaluate(() => { Storage.prototype.setItem = window.qaStore; localStorage.setItem('hoyos.theme', JSON.stringify({ theme: 'dark', skin: 'styled' })); }); await page.reload(); await button().waitFor();
    await amount().fill('123000'); await note().fill('FICTIONAL collection'); await ack().check();
    await dialog.getByRole('combobox', { name: en ? /^Method received at the desk/ : /^Método recibido en recepción/ }).selectOption('card'); await capture('ready-dark');
    await button().evaluate(el => { el.click(); el.click(); });
    await page.getByText(en ? /Demo payment qa_desk confirmed:/ : /Pago demo qa_desk confirmado:/).waitFor();
    const result = await page.evaluate(() => { const db = JSON.parse(localStorage.getItem('hoyos.db.v1')).db; return { payment: db.payments.find(r => r.id === 'qa_desk'), grants: db.class_ledger.filter(r => r.payment_id === 'qa_desk'), audit: db.audit_log.filter(r => r.id === 'desk-settlement:qa_desk'), bookings: db.bookings.filter(r => r.user_id === 'usr_cust'), invoice: db.invoices.filter(r => r.payment_id === 'qa_desk') }; });
    assert.equal(result.payment.status, 'approved'); assert.equal(result.payment.method, 'card'); assert.equal(result.payment.taken_by, 'usr_desk'); assert.equal(result.grants.length, 1); assert.equal(result.grants[0].delta, 14); assert.equal(result.grants[0].expires_at, '2099-01-05'); assert.equal(result.audit.length, 1); assert.equal(result.bookings.length, 0); assert.equal(result.invoice.length, 0);
    await page.goto(`${base}/#/staff/transfers?payment=qa_desk`); await page.getByText(en ? 'The requested payment or receipt is unavailable in this queue.' : 'El pago o comprobante solicitado no está disponible en esta cola.', { exact: true }).waitFor(); assert.equal(await page.getByRole('dialog').count(), 0);
    for (const userId of ['usr_cust', 'usr_fin', 'usr_teach']) {
      await page.evaluate(id => localStorage.setItem('hoyos.session', JSON.stringify({ userId: id, viewAs: null, devMode: false })), userId); await page.reload(); await page.goto(`${base}/#/staff/transfers?payment=qa_historical`); await page.waitForURL(/no-access/);
    }
    checks.push(`${lang}: missing terms blocked, amount under/over, empty/ready, close no writes/reset, quota rollback/retry, cash-to-card-terminal attribution, double click one grant/audit, no booking/invoice, stale deep link, customer/finance/teacher denied; 390/768/1280 light/dark and error layouts`);
    await context.close();
  }
  assert.deepEqual(errors, []); await writeFile(`${output}/results.json`, JSON.stringify({ base, checks, errors, limits: ['Fictional browser-local settlement only; booking-intent/backend/email integration and owner acceptance remain pending.'] }, null, 2)); console.log(checks.join('\n'));
} catch (error) { if (active && !active.isClosed()) { await active.screenshot({ path: `${output}/failure.jpg`, fullPage: true }); await writeFile(`${output}/failure.txt`, await active.locator('body').innerText()); } throw error; }
finally { await browser.close(); }
