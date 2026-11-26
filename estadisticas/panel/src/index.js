// Worker del panel: solo lee la base. Los datos (/api/visitas) se entregan solo con una sesión válida,
// que se obtiene con la contraseña guardada como secreto PANEL_CLAVE. La página en sí no contiene datos.
import { claveConfigurada, claveCorrecta, crearSesion, sesionValida, leerCookie, cookieSesion, cookieBorrar } from '../../compartido/sesion.js';

const SIN_CACHE = { 'Cache-Control': 'no-store' };
const MAX_FILAS = 100000;
const MAX_RANGO_S = 400 * 86400;
const ESPERA_ERROR_MS = 1500; // frena los intentos de adivinar la contraseña

function respuesta(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SIN_CACHE, ...extra } });
}

export async function visitas(url, env, ahora = Math.floor(Date.now() / 1000)) {
  let hasta = parseInt(url.searchParams.get('hasta'), 10);
  let desde = parseInt(url.searchParams.get('desde'), 10);
  if (!Number.isFinite(hasta)) hasta = ahora + 1;
  if (!Number.isFinite(desde)) desde = hasta - 7 * 86400;
  if (desde >= hasta || hasta - desde > MAX_RANGO_S) return respuesta({ error: 'rango inválido' }, 400);
  const { results } = await env.DB
    .prepare('SELECT visitante AS v, inicio AS i, ultimo AS u, pais AS p, provincia AS r FROM visitas WHERE inicio >= ?1 AND inicio < ?2 ORDER BY inicio LIMIT ?3')
    .bind(desde, hasta, MAX_FILAS + 1)
    .all();
  const truncado = results.length > MAX_FILAS;
  return respuesta({ desde, hasta, ahora, truncado, filas: truncado ? results.slice(0, MAX_FILAS) : results });
}

async function entrar(request, env, esperar) {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin) return respuesta({ error: 'origen' }, 403);
  let intento = '';
  try {
    const texto = await request.text();
    if (texto.length > 1000) return respuesta({ error: 'pedido' }, 400);
    intento = String(JSON.parse(texto).clave || '');
  } catch {
    return respuesta({ error: 'pedido' }, 400);
  }
  if (!(await claveCorrecta(intento, env.PANEL_CLAVE))) {
    await esperar(ESPERA_ERROR_MS);
    return respuesta({ error: 'clave' }, 401);
  }
  return respuesta({ ok: true }, 200, { 'Set-Cookie': cookieSesion(await crearSesion(env.PANEL_CLAVE)) });
}

export function crearPanel({ esperar = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido', { status: 405, headers: SIN_CACHE });
        return env.ASSETS.fetch(request);
      }
      if (!claveConfigurada(env)) return respuesta({ error: 'sin-configurar' }, 503);
      if (url.pathname === '/api/entrar' && request.method === 'POST') return entrar(request, env, esperar);
      if (url.pathname === '/api/salir' && request.method === 'POST') return respuesta({ ok: true }, 200, { 'Set-Cookie': cookieBorrar() });
      if (request.method !== 'GET') return respuesta({ error: 'método' }, 405);
      if (!(await sesionValida(leerCookie(request), env.PANEL_CLAVE))) return respuesta({ error: 'sin-sesion' }, 401);
      if (url.pathname === '/api/visitas') return visitas(url, env);
      if (url.pathname === '/api/yo') return respuesta({ ok: true });
      return respuesta({ error: 'no existe' }, 404);
    },
  };
}

export default crearPanel();
