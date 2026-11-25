// Prueba del panel en un navegador con datos simulados: dibuja todo, filtra por página y descarga el CSV.
// Uso: node tests/e2e_panel.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const PUB = path.join(__dirname, '../estadisticas/panel/public');
const BASE = 'https://crilar-panel.prueba.workers.dev/';
const ahora = Math.floor(Date.now() / 1000);
const filas = [
  { s: 'museo', v: 'aaaaaaaa-1', i: ahora - 3000, u: ahora - 2800, p: 'AR', r: 'La Rioja' },
  { s: 'museo', v: 'bbbbbbbb-2', i: ahora - 2000, u: ahora - 1990, p: 'AR', r: 'Córdoba' },
  { s: 'museo', v: 'aaaaaaaa-1', i: ahora - 900, u: ahora - 20, p: 'AR', r: 'La Rioja' },
  { s: 'vitrina', v: 'cccccccc-3', i: ahora - 600, u: ahora - 400, p: 'CL', r: 'Santiago' },
];

(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.route(BASE + '**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/visitas') {
      const desde = +u.searchParams.get('desde'), hasta = +u.searchParams.get('hasta');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ desde, hasta, ahora, truncado: false, filas: filas.filter((f) => f.i >= desde && f.i < hasta) }) });
    }
    const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    return route.fulfill({ status: 200, body: fs.readFileSync(path.join(PUB, rel)), headers: { 'Content-Type': tipos[path.extname(rel)] } });
  });
  await page.goto(BASE);
  await page.click('[data-rango="7d"]');
  await page.waitForFunction(() => document.getElementById('k-ingresos').textContent === '4');
  const t = (id) => page.$eval('#' + id, (n) => n.textContent);
  assert.equal(await t('k-unicos'), '3');
  assert.equal(await t('sitio-texto'), 'Ambas páginas');
  assert.ok((await t('g-sitio')).includes('Visita virtual'));
  assert.ok((await t('g-sitio')).includes('Vitrina'));
  assert.ok((await t('g-prov')).includes('La Rioja'));
  assert.ok((await t('g-pais')).includes('Chile'));

  await page.click('[data-sitio="museo"]');
  assert.equal(await t('k-ingresos'), '3');
  assert.equal(await t('sitio-texto'), 'Visita virtual');
  assert.equal(await page.$eval('#t-sitio', (n) => n.hidden), true);
  assert.equal(await t('k-recurrentes'), '1 volvió más de una vez');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  assert.match(descarga.suggestedFilename(), /^estadisticas_museo_/);
  const csv = fs.readFileSync(await descarga.path(), 'utf8');
  assert.equal(csv.trim().split('\r\n').length, 4, 'cabecera y 3 visitas del museo');
  assert.ok(!csv.includes('Vitrina'));

  await page.click('[data-sitio="vitrina"]');
  assert.equal(await t('k-ingresos'), '1');
  await page.click('[data-sitio="todos"]');
  assert.equal(await t('k-ingresos'), '4');

  if (process.env.CAPTURAS) await page.screenshot({ path: path.join(process.env.CAPTURAS, 'e2e_panel.png'), fullPage: true });
  assert.deepEqual(errores, []);
  await nav.close();
  console.log('e2e del panel: todas las pruebas pasaron');
})().catch((e) => { console.error(e); process.exit(1); });
