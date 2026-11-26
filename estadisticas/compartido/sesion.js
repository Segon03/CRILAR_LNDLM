// Login del panel con una contraseña única guardada como secreto del Worker (PANEL_CLAVE).
// La contraseña nunca está en el código. Al entrar, el Worker entrega una cookie firmada que vence sola.
// Falla cerrado: sin contraseña configurada, o con una de menos de MIN_CLAVE caracteres, no entra nadie.

export const MIN_CLAVE = 12;
export const DURACION_S = 12 * 3600; // la sesión dura 12 horas
export const COOKIE = 'panel_sesion';

const cod = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function desdeB64url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function claveConfigurada(env) {
  return typeof (env && env.PANEL_CLAVE) === 'string' && env.PANEL_CLAVE.length >= MIN_CLAVE;
}

function llave(clave) {
  return crypto.subtle.importKey('raw', cod.encode('micrositio-panel|' + clave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Compara la contraseña escrita con la configurada sin revelar por el tiempo de respuesta cuánto coincide.
export async function claveCorrecta(intento, clave) {
  if (typeof intento !== 'string' || typeof clave !== 'string' || !clave) return false;
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', cod.encode(intento)), crypto.subtle.digest('SHA-256', cod.encode(clave))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

// Token "vencimiento.firma". Cambiar la contraseña invalida todas las sesiones abiertas.
export async function crearSesion(clave, ahora = Math.floor(Date.now() / 1000)) {
  const exp = ahora + DURACION_S;
  const firma = await crypto.subtle.sign('HMAC', await llave(clave), cod.encode('sesion.' + exp));
  return `${exp}.${b64url(firma)}`;
}

export async function sesionValida(token, clave, ahora = Math.floor(Date.now() / 1000)) {
  try {
    if (typeof token !== 'string' || !clave) return false;
    const m = /^(\d{1,12})\.([A-Za-z0-9_-]{20,100})$/.exec(token);
    if (!m) return false;
    const exp = Number(m[1]);
    if (exp <= ahora || exp > ahora + DURACION_S + 60) return false;
    return await crypto.subtle.verify('HMAC', await llave(clave), desdeB64url(m[2]), cod.encode('sesion.' + exp));
  } catch {
    return false;
  }
}

export function leerCookie(request, nombre = COOKIE) {
  const c = request.headers.get('Cookie') || '';
  for (const parte of c.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}

export function cookieSesion(token) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${DURACION_S}; HttpOnly; Secure; SameSite=Strict`;
}
export function cookieBorrar() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
