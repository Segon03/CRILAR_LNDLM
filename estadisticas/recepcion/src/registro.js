import { MIN_ENTRE_AVISOS_S } from '../../compartido/validacion.js';

// "i" crea la visita si no existe. "l" (sigue acá) la crea si no existe o extiende su último aviso.
export async function registrar(db, { t, s, v }, ahora, { pais, provincia }) {
  if (t === 'i') {
    await db
      .prepare('INSERT OR IGNORE INTO visitas (id, visitante, inicio, ultimo, pais, provincia) VALUES (?1, ?2, ?3, ?3, ?4, ?5)')
      .bind(s, v, ahora, pais, provincia)
      .run();
    return;
  }
  await db
    .prepare(
      'INSERT INTO visitas (id, visitante, inicio, ultimo, pais, provincia) VALUES (?1, ?2, ?3, ?3, ?4, ?5) ' +
      'ON CONFLICT(id) DO UPDATE SET ultimo = excluded.ultimo WHERE excluded.ultimo - visitas.ultimo >= ?6'
    )
    .bind(s, v, ahora, pais, provincia, MIN_ENTRE_AVISOS_S)
    .run();
}

// Un participante por correo: si ya está anotado, se conserva la primera inscripción.
export async function anotarParticipante(db, p, ahora, { pais, provincia }) {
  await db
    .prepare('INSERT OR IGNORE INTO participantes (fecha, nombre, email, telefono, codigo, objetos, pais, provincia) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(ahora, p.nombre, p.email, p.telefono, p.codigo, p.objetos, pais, provincia)
    .run();
}
