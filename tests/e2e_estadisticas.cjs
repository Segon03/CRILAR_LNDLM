// Prueba de punta a punta del micrositio con las estadísticas.
// Sirve los archivos del repositorio como si estuvieran en https://segon03.github.io/CRILAR_LNDLM/
// (así el origen es el real) y simula la recepción de Cloudflare.
// Uso: node tests/e2e_estadisticas.cjs [carpeta del sitio]   (por defecto, la raíz del repositorio)
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const RAIZ = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SITIO = 'https://segon03.github.io/CRILAR_LNDLM/';
const RECEPCION = 'https://micrositio-recepcion.prueba.workers.dev/api/e';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

async function abrir(navegador, { query = '', endpoint = '', abierta = false, recepcionCaida = false, movil = false } = {}) {
  const ctx = await navegador.newContext(movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const avisos = [], faltantes = [], errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.route(RECEPCION, async (route) => {
    const req = route.request();
    if (recepcionCaida) return route.abort('connectionrefused');
    if (req.method() === 'POST') avisos.push({ cuerpo: JSON.parse(req.postData()), origen: req.headers()['origin'] });
    return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'https://segon03.github.io', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  });
  await page.route(SITIO + '**', async (route) => {
    const u = new URL(route.request().url());
    let rel = decodeURIComponent(u.pathname.slice('/CRILAR_LNDLM/'.length)) || 'index.html';
    const archivo = path.join(RAIZ, rel);
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { faltantes.push(rel); return route.fulfill({ status: 404, body: 'no' }); }
    let cuerpo = fs.readFileSync(archivo);
    if (rel === 'js/estadisticas.js' && endpoint) cuerpo = Buffer.from(cuerpo.toString().replace("var ENDPOINT = '';", `var ENDPOINT = '${endpoint}';`));
    if (rel === 'datos/muestra.js' && abierta) cuerpo = Buffer.from(cuerpo.toString().replace(/"apertura": "[^"]+"/, '"apertura": "2020-01-01T00:00:00-03:00"'));
    return route.fulfill({ status: 200, body: cuerpo, headers: { 'Content-Type': TIPOS[path.extname(rel)] || 'application/octet-stream', Date: new Date().toUTCString() } });
  });
  await page.goto(SITIO + query, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  return { ctx, page, avisos, faltantes, errores };
}

const estado = (page) => page.evaluate(() => ({
  aviso: !document.getElementById('aviso-estadisticas').hidden,
  cuenta: !document.getElementById('cuenta').hidden,
  listo: document.getElementById('cargando').classList.contains('listo'),
  boton: document.getElementById('intro-boton').disabled,
}));

async function entrar(page) {
  await page.waitForFunction(() => !document.getElementById('intro-boton').disabled, null, { timeout: 15000 });
  await page.click('#intro-boton');
  await page.waitForFunction(() => document.getElementById('cargando').classList.contains('listo'), null, { timeout: 15000 });
}

(async () => {
  const nav = await chromium.launch();
  let r, e;

  // 1. Como se publica: estadísticas apagadas y antes de la apertura (cuenta regresiva)
  r = await abrir(nav);
  e = await estado(r.page);
  assert.equal(e.aviso, false, 'apagadas: no muestra el aviso');
  assert.equal(r.avisos.length, 0, 'apagadas: no envía nada');
  const ahora = Date.now(), apertura = Date.parse('2026-11-27T18:00:00-03:00');
  if (ahora < apertura) assert.equal(e.cuenta, true, 'antes de la apertura se ve la cuenta regresiva');
  assert.deepEqual(r.errores, []); assert.deepEqual(r.faltantes, []);
  await r.ctx.close();
  console.log('ok 1: publicado tal cual (apagadas), sin errores ni archivos faltantes');

  // 2. Encendidas, visita abierta: cuenta, muestra el aviso y la visita funciona
  r = await abrir(nav, { endpoint: RECEPCION, abierta: true });
  e = await estado(r.page);
  assert.equal(e.aviso, true, 'encendidas: muestra el aviso');
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].cuerpo.t, 'i');
  assert.deepEqual(Object.keys(r.avisos[0].cuerpo).sort(), ['s', 't', 'v']);
  assert.equal(r.avisos[0].origen, 'https://segon03.github.io');
  await entrar(r.page);
  await r.page.waitForTimeout(15600);
  assert.ok(r.avisos.some((a) => a.cuerpo.t === 'l' && a.cuerpo.s === r.avisos[0].cuerpo.s), 'latido de "sigue acá"');
  await r.page.screenshot({ path: path.join(process.env.CAPTURAS || '/tmp', 'e2e_recorrido.png') });
  assert.deepEqual(r.errores, []); assert.deepEqual(r.faltantes, []);
  await r.ctx.close();
  console.log('ok 2: encendidas, envía ingreso y latido, la visita entra normal');

  // 3. Encendidas, pero la recepción no responde: la visita sigue igual
  r = await abrir(nav, { endpoint: RECEPCION, abierta: true, recepcionCaida: true });
  await entrar(r.page);
  assert.deepEqual(r.errores, []);
  await r.ctx.close();
  console.log('ok 3: con la recepción caída la visita funciona');

  // 4. Accesos de prueba del equipo: no se cuentan
  for (const q of ['?previa=1', '?cuenta=3', '?editar=1', '?sinstats=1']) {
    r = await abrir(nav, { query: q, endpoint: RECEPCION });
    assert.equal(r.avisos.length, 0, q);
    assert.equal((await estado(r.page)).aviso, false, q);
    if (q === '?previa=1') { assert.equal((await estado(r.page)).cuenta, false, 'previa saltea la cuenta regresiva'); await entrar(r.page); }
    if (q === '?cuenta=3') { await r.page.waitForTimeout(3500); assert.equal((await estado(r.page)).cuenta, false, 'la cuenta de prueba termina'); }
    assert.deepEqual(r.errores, [], q);
    await r.ctx.close();
  }
  console.log('ok 4: ?previa, ?cuenta, ?editar y ?sinstats no se cuentan y funcionan');

  // 5. Celular: capturas de la portada con el aviso, vertical y horizontal
  r = await abrir(nav, { endpoint: RECEPCION, movil: true });
  await r.page.screenshot({ path: path.join(process.env.CAPTURAS || '/tmp', 'e2e_portada_movil.png') });
  await r.page.setViewportSize({ width: 844, height: 390 });
  await r.page.waitForTimeout(300);
  await r.page.screenshot({ path: path.join(process.env.CAPTURAS || '/tmp', 'e2e_portada_horizontal.png') });
  const desborde = await r.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(desborde, false, 'sin desborde horizontal');
  assert.deepEqual(r.errores, []);
  await r.ctx.close();
  console.log('ok 5: portada en celular');

  await nav.close();
  console.log('e2e del micrositio: todas las pruebas pasaron');
})().catch((err) => { console.error(err); process.exit(1); });
