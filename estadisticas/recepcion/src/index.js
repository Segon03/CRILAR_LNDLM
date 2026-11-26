// Worker público de recepción: solo escribe. Recibe los avisos de visita del micrositio (/api/e) y las
// inscripciones al sorteo (/api/sorteo). No guarda la IP ni la ciudad.
import { leerPedido, leerParticipante, origenPermitido, esBot, geoDe, antesDeContar, MAX_CUERPO, MAX_CUERPO_SORTEO } from '../../compartido/validacion.js';
import { registrar, anotarParticipante } from './registro.js';

const RUTAS = { '/api/e': { max: MAX_CUERPO }, '/api/sorteo': { max: MAX_CUERPO_SORTEO } };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = RUTAS[url.pathname];
    if (!ruta) return new Response('No encontrado', { status: 404 });

    const cors = {
      'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const origenOk = origenPermitido(request.headers.get('Origin'), env.ORIGEN_PERMITIDO);

    if (request.method === 'OPTIONS') return new Response(null, { status: origenOk ? 204 : 403, headers: origenOk ? cors : {} });
    if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 });
    if (!origenOk) return new Response('Origen no permitido', { status: 403 });
    if (esBot(request.headers.get('User-Agent'))) return new Response(null, { status: 204, headers: cors });
    if (Number(request.headers.get('Content-Length') || 0) > ruta.max) return new Response('Muy grande', { status: 413, headers: cors });

    const texto = await request.text();
    const ahora = Math.floor(Date.now() / 1000);

    if (url.pathname === '/api/sorteo') {
      const p = leerParticipante(texto);
      if (!p) return new Response('Datos inválidos', { status: 400, headers: cors });
      if (antesDeContar(ahora, env.CONTAR_DESDE)) return new Response(null, { status: 204, headers: cors });
      try {
        await anotarParticipante(env.DB, p, ahora, geoDe(request.cf));
      } catch (e) {
        console.error('sorteo', e && e.message);
        return new Response('No se pudo guardar', { status: 500, headers: cors }); // el formulario avisa y deja reintentar
      }
      return new Response(null, { status: 204, headers: cors });
    }

    const pedido = leerPedido(texto);
    if (!pedido) return new Response('Pedido inválido', { status: 400, headers: cors });
    if (antesDeContar(ahora, env.CONTAR_DESDE)) return new Response(null, { status: 204, headers: cors });
    try {
      await registrar(env.DB, pedido, ahora, geoDe(request.cf));
    } catch (e) {
      console.error('registrar', e && e.message); // la app no debe notar un fallo de estadísticas
    }
    return new Response(null, { status: 204, headers: cors });
  },
};
