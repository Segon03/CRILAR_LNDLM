// Validaciones puras que usa el Worker de recepción del micrositio. Sin dependencias, para poder probarlas en Node.

export const TOPE_PERMANENCIA_S = 3600; // una visita no cuenta más de una hora
export const MIN_ENTRE_AVISOS_S = 5; // avisos de "sigue acá" más seguidos que esto se ignoran
export const MAX_CUERPO = 512; // bytes

const RE_ID = /^[0-9a-zA-Z-]{16,40}$/;

export function idValido(x) {
  return typeof x === 'string' && RE_ID.test(x);
}

export function esBot(ua) {
  return !ua || /bot|crawl|spider|headless|lighthouse/i.test(ua);
}

export function origenPermitido(origen, permitido) {
  return typeof permitido === 'string' && permitido !== '' && origen === permitido;
}

// Devuelve { t, s, v } o null si el pedido no es válido.
export function leerPedido(texto) {
  if (typeof texto !== 'string' || texto.length === 0 || texto.length > MAX_CUERPO) return null;
  let o;
  try { o = JSON.parse(texto); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  if (o.t !== 'i' && o.t !== 'l') return null;
  if (!idValido(o.s) || !idValido(o.v)) return null;
  return { t: o.t, s: o.s, v: o.v };
}

export function limpiarTexto(x, max = 60) {
  if (typeof x !== 'string') return null;
  const t = x.replace(/[\u0000-\u001f<>"'`]/g, '').trim().slice(0, max);
  return t || null;
}

// País y provincia a partir de lo que Cloudflare agrega a la conexión (request.cf). No se guarda nada más.
export function geoDe(cf) {
  const pais = limpiarTexto(cf && cf.country, 2);
  return { pais: pais ? pais.toUpperCase() : null, provincia: limpiarTexto(cf && cf.region) };
}

// Antes de CONTAR_DESDE (segundos desde 1970, hora del servidor) los avisos se aceptan pero no se guardan.
// Sin valor, o con un valor que no es un número, se cuenta siempre.
export function antesDeContar(ahora, desde) {
  const d = Number(desde);
  return Number.isFinite(d) && d > 0 && ahora < d;
}

// ---------- sorteo ----------
export const MAX_CUERPO_SORTEO = 2000; // bytes
const RE_EMAIL = /^[^\s@<>"'`]{1,64}@[^\s@<>"'`]{1,190}\.[^\s@<>"'`.]{2,24}$/;
const RE_CODIGO = /^CR-[0-9A-Z]{6}$/;

// Devuelve { nombre, email, edad, domicilio, telefono, codigo, objetos } o null si el formulario no es válido.
// Solo mayores de 18: un menor participa a través de un adulto que se inscribe con sus propios datos.
// El correo se guarda en minúsculas: es lo que impide anotarse dos veces.
export function leerParticipante(texto) {
  if (typeof texto !== 'string' || texto.length === 0 || texto.length > MAX_CUERPO_SORTEO) return null;
  let o;
  try { o = JSON.parse(texto); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const nombre = limpiarTexto(o.nombre, 100);
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : '';
  const edad = Number(o.edad);
  const domicilio = limpiarTexto(o.domicilio, 150);
  const telefono = limpiarTexto(o.telefono, 40);
  const codigo = typeof o.codigo === 'string' ? o.codigo.trim().toUpperCase() : '';
  const objetos = Number(o.objetos);
  if (!nombre || nombre.length < 3) return null;
  if (email.length > 254 || !RE_EMAIL.test(email)) return null;
  if (!Number.isInteger(edad) || edad < 18 || edad > 120) return null;
  if (!domicilio || domicilio.length < 5) return null;
  if (!RE_CODIGO.test(codigo)) return null;
  if (!Number.isInteger(objetos) || objetos < 0 || objetos > 500) return null;
  return { nombre, email, edad, domicilio, telefono, codigo, objetos };
}

// A partir de SORTEO_HASTA (segundos desde 1970) la inscripción al sorteo queda cerrada. Sin valor válido, nunca cierra.
export function sorteoTerminado(ahora, hasta) {
  const h = Number(hasta);
  return Number.isFinite(h) && h > 0 && ahora >= h;
}
