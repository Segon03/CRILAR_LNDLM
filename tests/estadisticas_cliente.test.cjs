// Pruebas del script de estadísticas de la visita virtual (js/estadisticas.js). Uso: node tests/estadisticas_cliente.test.cjs
const assert = require('node:assert/strict');
const E = require('../js/estadisticas.js');

const URL_OK = 'https://crilar-recepcion.ejemplo.workers.dev/api/e';
const p = (q) => new URLSearchParams(q);
const base = { endpoint: URL_OK, params: p(''), protocolo: 'https:', host: 'segon03.github.io', marcaExcluir: null };

// ---------- cuándo se cuenta ----------
assert.equal(E.debeContar(base), true);
assert.equal(E.debeContar({ ...base, endpoint: '' }), false, 'apagadas sin dirección');
assert.equal(E.debeContar({ ...base, host: 'localhost' }), false);
assert.equal(E.debeContar({ ...base, host: '127.0.0.1' }), false);
assert.equal(E.debeContar({ ...base, protocolo: 'file:', host: '' }), false, 'archivo abierto con doble clic');
assert.equal(E.debeContar({ ...base, marcaExcluir: '1' }), false);
assert.equal(E.debeContar({ ...base, marcaExcluir: '0' }), true);
for (const q of ['?previa=1', '?previa=0', '?cuenta=30', '?editar=1', '?editar=1&escena=sala2']) {
  assert.equal(E.debeContar({ ...base, params: p(q) }), false, q);
}
assert.equal(E.debeContar({ ...base, params: p('?escena=sala2_L') }), true, 'un enlace a una sala sí cuenta');

// ---------- identificador de visita ----------
function almacen() { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }
const ses = almacen();
const a = E.idDeVisita(ses, 1000);
ses.setItem('crilar_museo_t', '1000');
assert.equal(E.idDeVisita(ses, 1000 + 10 * 60 * 1000), a, 'misma visita dentro de 30 min');
const b = E.idDeVisita(ses, 1000 + 31 * 60 * 1000);
assert.notEqual(b, a, 'visita nueva después de 30 min sin actividad');
assert.match(a, /^[0-9a-zA-Z-]{16,40}$/);
assert.ok(!ses.m.has('crilar_sid'), 'no pisa la clave de la app de la vitrina');

// ---------- arranque completo con una ventana falsa ----------
function ventana(search, { host = 'segon03.github.io', localFalla = false } = {}) {
  const enviados = [], escuchas = {}, intervalos = [];
  const local = almacen(), sesion = almacen();
  const aviso = { hidden: true };
  const win = {
    location: { search, hostname: host, protocol: 'https:' },
    get localStorage() { if (localFalla) throw new Error('bloqueado'); return local; },
    sessionStorage: sesion,
    navigator: { sendBeacon: (u, blob) => { enviados.push({ u, beacon: true, blob }); return true; } },
    Blob: class { constructor(partes) { this.texto = partes.join(''); } },
    fetch: (u, o) => { enviados.push({ u, cuerpo: JSON.parse(o.body) }); return Promise.resolve({}); },
    setInterval: (fn, ms) => { intervalos.push({ fn, ms }); return 1; },
    addEventListener: (ev, fn) => { (escuchas[ev] = escuchas[ev] || []).push(fn); },
    document: {
      visibilityState: 'visible',
      addEventListener: (ev, fn) => { (escuchas[ev] = escuchas[ev] || []).push(fn); },
      getElementById: (id) => (id === 'aviso-estadisticas' ? aviso : null),
    },
  };
  return { win, enviados, escuchas, intervalos, local, sesion, aviso };
}

let w = ventana('');
assert.equal(E.iniciar(w.win, URL_OK), true);
assert.equal(w.enviados.length, 1);
assert.deepEqual(Object.keys(w.enviados[0].cuerpo).sort(), ['s', 'si', 't', 'v']);
assert.equal(w.enviados[0].cuerpo.t, 'i');
assert.equal(w.enviados[0].cuerpo.si, 'museo');
assert.equal(w.aviso.hidden, false, 'muestra el aviso de privacidad');
assert.equal(w.intervalos[0].ms, 15000);
w.intervalos[0].fn();
assert.equal(w.enviados[1].cuerpo.t, 'l');
assert.equal(w.enviados[1].cuerpo.s, w.enviados[0].cuerpo.s);
w.win.document.visibilityState = 'hidden';
w.intervalos[0].fn();
assert.equal(w.enviados.length, 2, 'sin latidos con la página oculta');
w.escuchas.pagehide[0]();
assert.equal(w.enviados[2].beacon, true);
assert.equal(JSON.parse(w.enviados[2].blob.texto).t, 'l');

// apagadas: no envía nada ni muestra el aviso
w = ventana('');
assert.equal(E.iniciar(w.win, ''), false);
assert.equal(w.enviados.length, 0); assert.equal(w.aviso.hidden, true);

// ?previa no se cuenta
w = ventana('?previa=1');
assert.equal(E.iniciar(w.win, URL_OK), false); assert.equal(w.enviados.length, 0);

// ?sinstats=1 marca el navegador y se recuerda; ?sinstats=0 lo desmarca
w = ventana('?sinstats=1');
assert.equal(E.iniciar(w.win, URL_OK), false);
assert.equal(w.local.getItem('crilar_sinstats'), '1');
w.win.location.search = '';
assert.equal(E.iniciar(w.win, URL_OK), false, 'sigue excluido sin el parámetro');
w.win.location.search = '?sinstats=0';
assert.equal(E.iniciar(w.win, URL_OK), true);

// sin localStorage (modo privado estricto) sigue funcionando
w = ventana('', { localFalla: true });
assert.equal(E.iniciar(w.win, URL_OK), true); assert.equal(w.enviados.length, 1);

// si fetch revienta, no propaga el error
w = ventana('');
w.win.fetch = () => { throw new Error('sin red'); };
assert.equal(E.iniciar(w.win, URL_OK), true);

// el archivo publicado sale apagado
const fuente = require('node:fs').readFileSync(require('node:path').join(__dirname, '../js/estadisticas.js'), 'utf8');
assert.match(fuente, /var ENDPOINT = '';/, 'ENDPOINT tiene que estar vacío hasta configurar Cloudflare');

console.log('estadisticas (cliente de la visita virtual): todas las pruebas pasaron');
