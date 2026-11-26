// Pruebas de la recepción de estadísticas y del login del panel. Uso: node tests/estadisticas.test.mjs
import assert from 'node:assert/strict';
import { idValido, leerPedido, esBot, origenPermitido, geoDe, limpiarTexto, antesDeContar, MAX_CUERPO } from '../estadisticas/compartido/validacion.js';
import * as S from '../estadisticas/compartido/sesion.js';
import { registrar } from '../estadisticas/recepcion/src/registro.js';
import recepcion from '../estadisticas/recepcion/src/index.js';
import { crearPanel, visitas } from '../estadisticas/panel/src/index.js';

const UUID1 = '3f2b8c1e-9d4a-4e7b-8a10-5c6d7e8f9a0b', UUID2 = 'a1b2c3d4-e5f6-4789-9abc-def012345678';

// ---------- validación ----------
assert.equal(idValido(UUID1), true);
assert.equal(idValido('corto'), false);
assert.equal(idValido("x'; DROP TABLE visitas;--0000"), false);
assert.equal(idValido(123), false);
assert.deepEqual(leerPedido(JSON.stringify({ t: 'i', s: UUID1, v: UUID2 })), { t: 'i', s: UUID1, v: UUID2 });
assert.equal(leerPedido(JSON.stringify({ t: 'x', s: UUID1, v: UUID2 })), null);
assert.equal(leerPedido(JSON.stringify({ t: 'l', s: 'malo', v: UUID2 })), null);
assert.equal(leerPedido('no es json'), null);
assert.equal(leerPedido(''), null);
assert.equal(leerPedido('[]'), null);
assert.equal(leerPedido('x'.repeat(MAX_CUERPO + 1)), null);
assert.equal(esBot(''), true);
assert.equal(esBot('Googlebot/2.1'), true);
assert.equal(esBot('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36'), false);
assert.equal(origenPermitido('https://segon03.github.io', 'https://segon03.github.io'), true);
assert.equal(origenPermitido('https://otro.com', 'https://segon03.github.io'), false);
assert.equal(origenPermitido(null, 'https://segon03.github.io'), false);
assert.equal(origenPermitido('https://segon03.github.io', ''), false); // sin configurar no deja pasar
assert.deepEqual(geoDe({ country: 'ar', region: 'La Rioja', city: 'La Rioja', postalCode: '5300' }), { pais: 'AR', provincia: 'La Rioja' });
assert.deepEqual(geoDe(undefined), { pais: null, provincia: null });
assert.equal(limpiarTexto('<b>Córdoba</b>'), 'bCórdoba/b'); // quita < y >
assert.equal(limpiarTexto('x'.repeat(200)).length, 60);

// ---------- registro (con una base falsa) ----------
function baseFalsa() {
  const llamadas = [];
  return { llamadas, prepare(sql) { return { bind(...args) { return { run: async () => { llamadas.push({ sql, args }); } }; } }; } };
}
let db = baseFalsa();
await registrar(db, { t: 'i', s: UUID1, v: UUID2 }, 1000, { pais: 'AR', provincia: 'La Rioja' });
assert.match(db.llamadas[0].sql, /INSERT OR IGNORE/);
assert.deepEqual(db.llamadas[0].args, [UUID1, UUID2, 1000, 'AR', 'La Rioja']);
db = baseFalsa();
await registrar(db, { t: 'l', s: UUID1, v: UUID2 }, 1015, { pais: null, provincia: null });
assert.match(db.llamadas[0].sql, /ON CONFLICT\(id\) DO UPDATE SET ultimo/);
assert.equal(db.llamadas[0].args.at(-1), 5);

// ---------- Worker de recepción ----------
const ORIGEN = 'https://segon03.github.io';
const UA = 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36';
function pedido({ metodo = 'POST', origen = ORIGEN, ua = UA, cuerpo = JSON.stringify({ t: 'i', s: UUID1, v: UUID2 }), ruta = '/api/e' } = {}) {
  const h = {}; if (origen) h.Origin = origen; if (ua) h['User-Agent'] = ua; h['Content-Type'] = 'text/plain';
  const r = new Request('https://recepcion.ejemplo.workers.dev' + ruta, { method: metodo, headers: h, body: metodo === 'POST' ? cuerpo : undefined });
  Object.defineProperty(r, 'cf', { value: { country: 'AR', region: 'La Rioja' } });
  return r;
}
let env = { DB: baseFalsa(), ORIGEN_PERMITIDO: ORIGEN };
let r = await recepcion.fetch(pedido(), env);
assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEN);
assert.equal(env.DB.llamadas.length, 1);
assert.deepEqual(env.DB.llamadas[0].args, [UUID1, UUID2, env.DB.llamadas[0].args[2], 'AR', 'La Rioja']);
env = { DB: baseFalsa(), ORIGEN_PERMITIDO: ORIGEN };
assert.equal((await recepcion.fetch(pedido({ origen: 'https://malo.com' }), env)).status, 403);
assert.equal((await recepcion.fetch(pedido({ origen: null }), env)).status, 403);
assert.equal((await recepcion.fetch(pedido({ cuerpo: 'basura' }), env)).status, 400);
assert.equal((await recepcion.fetch(pedido({ ruta: '/otra' }), env)).status, 404);
assert.equal((await recepcion.fetch(pedido({ metodo: 'OPTIONS' }), env)).status, 204);
assert.equal((await recepcion.fetch(pedido({ ua: 'Googlebot/2.1' }), env)).status, 204);
assert.equal(env.DB.llamadas.length, 0, 'ningún pedido inválido o de bot toca la base');
// un fallo de la base no se le nota a la app
env = { DB: { prepare() { throw new Error('caída'); } }, ORIGEN_PERMITIDO: ORIGEN };
assert.equal((await recepcion.fetch(pedido(), env)).status, 204);

// ---------- hora de inicio ----------
assert.equal(antesDeContar(100, '200'), true);
assert.equal(antesDeContar(200, '200'), false);
assert.equal(antesDeContar(300, '200'), false);
assert.equal(antesDeContar(100, ''), false, 'vacío: se cuenta siempre');
assert.equal(antesDeContar(100, undefined), false);
assert.equal(antesDeContar(100, 'x'), false);
{
  const envFut = { DB: baseFalsa(), ORIGEN_PERMITIDO: ORIGEN, CONTAR_DESDE: String(Math.floor(Date.now() / 1000) + 3600) };
  const rr = await recepcion.fetch(pedido(), envFut);
  assert.equal(rr.status, 204, 'antes de la hora responde bien');
  assert.equal(envFut.DB.llamadas.length, 0, 'pero no guarda nada');
  const envPas = { DB: baseFalsa(), ORIGEN_PERMITIDO: ORIGEN, CONTAR_DESDE: '1' };
  await recepcion.fetch(pedido(), envPas);
  assert.equal(envPas.DB.llamadas.length, 1, 'después de la hora guarda');
}
const recepcionWrangler = (await import('node:fs')).readFileSync(new URL('../estadisticas/recepcion/wrangler.jsonc', import.meta.url), 'utf8');
assert.match(recepcionWrangler, /"CONTAR_DESDE": "1795809600"/, '27/11/2026 17:00 hora de Argentina');

// ---------- login del panel ----------
const CLAVE = 'una-clave-larga-de-prueba';
assert.equal(S.claveConfigurada({}), false, 'sin contraseña no entra nadie');
assert.equal(S.claveConfigurada({ PANEL_CLAVE: 'corta' }), false, 'contraseña corta no vale');
assert.equal(S.claveConfigurada({ PANEL_CLAVE: CLAVE }), true);
assert.equal(await S.claveCorrecta(CLAVE, CLAVE), true);
assert.equal(await S.claveCorrecta(CLAVE + 'x', CLAVE), false);
assert.equal(await S.claveCorrecta('', CLAVE), false);
assert.equal(await S.claveCorrecta(CLAVE, ''), false);
const T0 = 2_000_000_000;
const tok = await S.crearSesion(CLAVE, T0);
assert.equal(await S.sesionValida(tok, CLAVE, T0 + 10), true);
assert.equal(await S.sesionValida(tok, CLAVE, T0 + S.DURACION_S + 1), false, 'vence');
assert.equal(await S.sesionValida(tok, 'otra-clave-larga-distinta', T0 + 10), false, 'cambiar la contraseña corta las sesiones');
const [exp, firma] = tok.split('.');
assert.equal(await S.sesionValida(`${Number(exp) + 3600}.${firma}`, CLAVE, T0 + 10), false, 'no se puede estirar el vencimiento');
assert.equal(await S.sesionValida(`${exp}.${firma.slice(0, -2)}AA`, CLAVE, T0 + 10), false, 'firma alterada');
assert.equal(await S.sesionValida('basura', CLAVE, T0), false);
assert.equal(await S.sesionValida(null, CLAVE, T0), false);
assert.match(S.cookieSesion(tok), /HttpOnly; Secure; SameSite=Strict/);
assert.equal(S.leerCookie(new Request('https://x/', { headers: { Cookie: `a=1; ${S.COOKIE}=${tok}; b=2` } })), tok);

// ---------- Worker del panel ----------
const filas = [{ v: UUID2, i: 1000, u: 1100, p: 'AR', r: 'La Rioja' }];
const P = crearPanel({ esperar: async () => {} });
const BASE_P = 'https://panel.ejemplo.workers.dev';
const envP = { PANEL_CLAVE: CLAVE, ASSETS: { fetch: async () => new Response('<html></html>') },
  DB: { prepare() { return { bind() { return { all: async () => ({ results: filas }) }; } }; } } };
const pedidoP = (ruta, o = {}) => new Request(BASE_P + ruta, o);
r = await P.fetch(pedidoP('/'), envP);
assert.equal(r.status, 200, 'la página (sin datos) se entrega');
assert.equal((await P.fetch(pedidoP('/api/visitas'), envP)).status, 401, 'sin sesión no hay datos');
assert.equal((await P.fetch(pedidoP('/api/yo'), envP)).status, 401);
assert.equal((await P.fetch(pedidoP('/api/visitas'), { ...envP, PANEL_CLAVE: '' })).status, 503, 'sin contraseña configurada no hay datos');
assert.equal((await P.fetch(pedidoP('/api/visitas', { headers: { Cookie: `${S.COOKIE}=${await S.crearSesion('otra-clave-larga-distinta')}` } }), envP)).status, 401, 'cookie firmada con otra clave');
const post = (cuerpo, origen = BASE_P) => pedidoP('/api/entrar', { method: 'POST', headers: { Origin: origen, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
assert.equal((await P.fetch(post({ clave: 'equivocada-pero-larga' }), envP)).status, 401);
assert.equal((await P.fetch(post({ clave: CLAVE }, 'https://otro.sitio'), envP)).status, 403, 'otro origen no puede iniciar sesión');
r = await P.fetch(post({ clave: CLAVE }), envP);
assert.equal(r.status, 200);
const galleta = r.headers.get('Set-Cookie');
assert.match(galleta, new RegExp(`^${S.COOKIE}=\\d+\\.`));
const conSesion = { headers: { Cookie: galleta.split(';')[0] } };
assert.equal((await P.fetch(pedidoP('/api/yo', conSesion), envP)).status, 200);
r = await P.fetch(pedidoP('/api/visitas?desde=0&hasta=2000', conSesion), envP);
assert.equal(r.status, 200);
r = await visitas(new URL('https://x/api/visitas?desde=0&hasta=2000'), envP, 1500);
assert.equal(r.status, 200); assert.deepEqual((await r.json()).filas, filas);
assert.equal((await visitas(new URL('https://x/api/visitas?desde=10&hasta=5'), envP)).status, 400);
assert.equal((await visitas(new URL('https://x/api/visitas?desde=0&hasta=999999999'), envP)).status, 400);
r = await P.fetch(pedidoP('/api/salir', { method: 'POST' }), envP);
assert.match(r.headers.get('Set-Cookie'), /Max-Age=0/);

console.log('estadisticas: todas las pruebas pasaron');
