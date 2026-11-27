// Prueba del panel del micrositio en un navegador con datos simulados: pide la contraseña, dibuja todo y descarga el CSV.
// Uso: node tests/e2e_panel.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const PUB = path.join(__dirname, '../estadisticas/panel/public');
const BASE = 'https://micrositio-panel.prueba.workers.dev/';
const ahora = Math.floor(Date.now() / 1000);
let sesion = false;
const participantes = [
  { fecha: ahora - 500, nombre: 'Ana Pérez', email: 'ana@ejemplo.com', edad: 34, domicilio: 'Calle 1 123, Chilecito', telefono: '', codigo: 'CR-1A2B3C', objetos: 12, pais: 'AR', provincia: 'La Rioja' },
  { fecha: ahora - 100, nombre: '<b>Luis</b>', email: 'luis@ejemplo.com', telefono: '380', codigo: 'CR-ZZZZZZ', objetos: 12, pais: 'AR', provincia: 'Córdoba' },
];
const filas = [
  { v: 'aaaaaaaa-1', i: ahora - 3000, u: ahora - 2800, p: 'AR', r: 'La Rioja' },
  { v: 'bbbbbbbb-2', i: ahora - 2000, u: ahora - 1990, p: 'AR', r: 'Córdoba' },
  { v: 'aaaaaaaa-1', i: ahora - 900, u: ahora - 20, p: 'AR', r: 'La Rioja' },
  { v: 'cccccccc-3', i: ahora - 600, u: ahora - 400, p: 'CL', r: 'Santiago' },
];

(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.route(BASE + '**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/entrar') {
      const ok = JSON.parse(route.request().postData()).clave === 'clave-de-prueba-larga';
      if (ok) sesion = true;
      return route.fulfill({ status: ok ? 200 : 401, contentType: 'application/json', body: '{}' });
    }
    if (u.pathname === '/api/salir') { sesion = false; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (u.pathname.startsWith('/api/') && !sesion) return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    if (u.pathname === '/api/participantes') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ filas: participantes }) });
    if (u.pathname === '/api/yo') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    if (u.pathname === '/api/visitas') {
      const desde = +u.searchParams.get('desde'), hasta = +u.searchParams.get('hasta');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ desde, hasta, ahora, truncado: false, filas: filas.filter((f) => f.i >= desde && f.i < hasta) }) });
    }
    const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    return route.fulfill({ status: 200, body: fs.readFileSync(path.join(PUB, rel)), headers: { 'Content-Type': tipos[path.extname(rel)] } });
  });
  await page.goto(BASE);
  await page.waitForSelector('#ingreso:not([hidden])');
  assert.equal(await page.$eval('#contenido', (n) => n.hidden), true, 'sin sesión no se ve el panel');
  await page.fill('#clave', 'otra-clave-equivocada');
  await page.click('#entrar');
  await page.waitForSelector('#error-ingreso:not([hidden])');
  assert.equal(await page.$eval('#error-ingreso', (n) => n.textContent), 'Contraseña incorrecta.');
  if (process.env.CAPTURAS) await page.screenshot({ path: path.join(process.env.CAPTURAS, 'e2e_panel_ingreso.png') });
  await page.fill('#clave', 'clave-de-prueba-larga');
  await page.click('#entrar');
  await page.waitForSelector('#contenido:not([hidden])');
  await page.click('[data-rango="7d"]');
  await page.waitForFunction(() => document.getElementById('k-ingresos').textContent === '4');
  const t = (id) => page.$eval('#' + id, (n) => n.textContent);
  assert.equal(await t('k-unicos'), '3');
  assert.ok((await t('g-prov')).includes('La Rioja'));
  assert.ok((await t('g-pais')).includes('Chile'));
  assert.equal(await t('k-recurrentes'), '1 volvió más de una vez');
  assert.equal(await page.$('[data-sitio]'), null, 'sin filtro por página');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  assert.match(descarga.suggestedFilename(), /^estadisticas_\d{4}-/);
  const csv = fs.readFileSync(await descarga.path(), 'utf8');
  assert.equal(csv.trim().split('\r\n').length, 5, 'cabecera y 4 visitas');
  assert.ok(!/sitio|vitrina/i.test(csv));
  assert.ok(!/vitrina/i.test(await page.content()), 'el panel no menciona la vitrina');

  // sorteo
  assert.equal(await t('s-n'), '2');
  assert.equal(await page.$$eval('#s-tabla tbody tr', (f) => f.length), 2);
  assert.equal(await page.$eval('#s-tabla tbody tr td:nth-child(2)', (n) => n.textContent), '<b>Luis</b>', 'muestra el texto sin interpretarlo como HTML');
  const [desc2] = await Promise.all([page.waitForEvent('download'), page.click('#s-csv')]);
  assert.match(desc2.suggestedFilename(), /^participantes_sorteo_/);
  assert.equal(fs.readFileSync(await desc2.path(), 'utf8').trim().split('\r\n').length, 3);
  await page.click('#s-sortear');
  assert.match(await t('s-ganador'), /^Ganador\/a: .+ · .+@ejemplo\.com · recorrido CR-.*Suplente 1: /s);
  if (process.env.CAPTURAS) await page.screenshot({ path: path.join(process.env.CAPTURAS, 'e2e_panel.png'), fullPage: true });
  await page.click('#salir');
  await page.waitForSelector('#ingreso:not([hidden])');
  assert.equal(await page.$eval('#contenido', (n) => n.hidden), true, 'al salir se oculta el panel');
  assert.deepEqual(errores, []);
  await nav.close();
  console.log('e2e del panel: todas las pruebas pasaron');
})().catch((e) => { console.error(e); process.exit(1); });
