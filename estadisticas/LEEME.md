# Estadísticas de uso: cómo publicarlas

Esta carpeta tiene lo necesario para registrar de forma anónima cuántas visitas tiene el micrositio de la Noche de los Museos (`https://segon03.github.io/CRILAR_LNDLM/`), cuánto tiempo se quedan, a qué hora entran y desde qué provincia y país. El plan completo está en `PLAN_ESTADISTICAS.md`, en la raíz del repositorio.

Las estadísticas son solo de este micrositio. No incluyen otros proyectos del CRILAR publicados en la misma cuenta de GitHub.

## Qué hay

- `recepcion/`: servicio público que recibe los avisos del micrositio y los guarda. Solo puede escribir.
- `panel/`: el panel privado. Solo puede leer. Se entra con una contraseña.
- `schema.sql`: la tabla de visitas.
- `compartido/`: validaciones y verificación del login, que usan los dos servicios.

En el micrositio, los avisos salen de `js/estadisticas.js`. Mientras la línea `var ENDPOINT = '';` de ese archivo esté vacía, las estadísticas están apagadas: la página no envía nada ni muestra el aviso de privacidad.

## Qué se guarda y qué no

Cada visita es una fila con: un identificador anónimo de la visita, un identificador anónimo del navegador, la hora de entrada, la hora del último aviso, el país y la provincia. No se guarda la IP, la ciudad, el dispositivo, el nombre ni nada que identifique a una persona.

## Antes de empezar

Todo se hace desde la página de Cloudflare, sin instalar nada en la computadora. Los nombres de los botones pueden cambiar un poco según cuándo lo mires. Calculá entre 30 y 40 minutos.

Los servicios se publican solos desde GitHub cada vez que cambia la rama elegida. Conviene elegir la misma rama que publica el sitio (hoy, `pruebas`, una vez que se una esta rama).

## Parte A: recepción (lo mínimo para empezar a contar)

1. **Cuenta.** Creá una cuenta gratuita en cloudflare.com.
2. **Base de datos.** En el menú, entrá a *Storage & databases > D1 SQL database* y creá una base llamada `micrositio-estadisticas`. Dentro de la base, abrí la pestaña *Console*, pegá el contenido de `estadisticas/schema.sql` y ejecutalo. Copiá el *Database ID* que aparece en la base.
3. **ID de la base en el código.** En `estadisticas/recepcion/wrangler.jsonc` y en `estadisticas/panel/wrangler.jsonc`, reemplazá `REEMPLAZAR_POR_EL_ID_DE_LA_BASE` por ese ID. No es un secreto.
4. **Publicar la recepción.** En *Workers & Pages*, elegí *Create > Import a repository*, conectá GitHub, autorizá el repositorio `Segon03/CRILAR_LNDLM` y completá:
   - Nombre del proyecto: `micrositio-recepcion` (tiene que ser igual al `name` de `wrangler.jsonc`).
   - Rama: la que publica el sitio.
   - Directorio raíz: `estadisticas/recepcion`.
   - Comando de despliegue: el que viene por defecto (`npx wrangler deploy`).

   Cuando termine, copiá la dirección que termina en `.workers.dev`.
5. **Encender las estadísticas.** En `js/estadisticas.js`, cambiá la línea `var ENDPOINT = '';` por la dirección del paso anterior seguida de `/api/e`, por ejemplo:

   ```js
   var ENDPOINT = 'https://micrositio-recepcion.TU-SUBDOMINIO.workers.dev/api/e';
   ```

   En `index.html`, subí el número de `js/estadisticas.js?v=1` a `?v=2` para que los celulares no usen la copia vieja. Subí los dos cambios a la rama que publica el sitio. Unos minutos después, las estadísticas quedan encendidas.
6. **Probar.** Abrí la página desde un celular (sin `?previa`, ver abajo), esperá unos segundos y en la consola de la base ejecutá:

   ```sql
   SELECT datetime(inicio, 'unixepoch', '-3 hours') AS entrada, ultimo - inicio AS segundos, pais, provincia FROM visitas ORDER BY inicio DESC LIMIT 5;
   ```

   Tiene que aparecer una fila nueva con el país y la provincia. A veces la provincia queda vacía, según la conexión.

## Parte B: panel privado

7. **Publicar el panel.** Igual que el paso 4, con estos datos:
   - Nombre del proyecto: `micrositio-panel`.
   - Directorio raíz: `estadisticas/panel`.
8. **Contraseña del panel.** En *Workers & Pages > micrositio-panel > Settings > Variables and Secrets*, elegí *Add*, tipo *Secret*, nombre `PANEL_CLAVE`, y escribí la contraseña (12 caracteres o más; conviene una frase larga). Guardá con *Deploy*. La contraseña queda cifrada en Cloudflare: no está en el código ni en GitHub. Mientras no esté configurada, el panel no entrega datos a nadie.
9. **Probar.** Abrí `https://micrositio-panel.segundoricardo.workers.dev` en una ventana privada. Tiene que pedir la contraseña; con una equivocada no entra.

### Vista pública para compartir

`https://micrositio-panel.segundoricardo.workers.dev/publico` muestra los mismos gráficos e indicadores sin pedir contraseña, para compartir. Es solo para mirar: no tiene el botón de CSV ni la sección del sorteo, y no entrega los identificadores de los navegadores (se reemplazan por números). Los datos del sorteo solo se ven en el panel con contraseña.

### Cambiar la contraseña o compartir el panel

Para que otra persona vea el panel, pasale la dirección y la contraseña por un canal privado. Para cambiarla, editá el secreto `PANEL_CLAVE` en el mismo lugar del paso 8: todas las sesiones abiertas se cierran solas y hay que entrar con la nueva. La sesión dura 12 horas; el botón *Salir* la cierra antes.

Por qué contraseña y no Cloudflare Access: Access (login con código por correo) pide cargar una tarjeta para activar el plan gratuito de Zero Trust. Si más adelante se quiere, se puede cambiar.

## Qué visitas no se cuentan

- Las que llevan `?previa`, `?cuenta` o `?editar` en la dirección: son los accesos de prueba del equipo.
- Las de un navegador marcado con `?sinstats=1`. Abrí la página una vez así en cada equipo de prueba y queda excluido para siempre. Con `?sinstats=0` se vuelve a contar.
- Las abiertas con doble clic desde la computadora o desde `localhost`.

Ojo: `?previa=1` también queda recordado en el navegador para saltear la cuenta regresiva, pero las estadísticas solo lo excluyen cuando está escrito en la dirección. Si querés que un equipo de prueba no cuente nunca, usá además `?sinstats=1`.

Los enlaces directos a una sala (`?escena=...`) sí cuentan, porque pueden llegarle a un visitante real.

## Sorteo

El formulario del sorteo del micrositio envía los datos a `/api/sorteo` de la misma recepción, y se guardan en la tabla `participantes` de la base: fecha, nombre, correo, edad, domicilio, teléfono (opcional), número de recorrido, cantidad de objetos visitados, y país y provincia de la conexión. Solo se aceptan mayores de 18 años: un menor participa a través de un adulto que se inscribe con sus propios datos. Hay un participante por correo; si alguien se anota dos veces, queda la primera inscripción. Si la base no responde, el formulario avisa y deja reintentar.

En el panel, al final, está la lista de participantes con dos botones: *Descargar participantes (CSV)* y *Sortear un ganador*, que elige uno al azar con el generador seguro del navegador y muestra la fecha y la hora del sorteo. Conviene sortear con testigos y guardar una captura y el CSV.

Son datos personales: solo se leen desde el panel, con contraseña, y no conviene compartirlos fuera del equipo organizador. Para borrarlos cuando termine el sorteo: `DELETE FROM participantes;` en la consola de la base.

La tabla se crea con la segunda parte de `schema.sql`.

## Desde cuándo se cuenta

La recepción guarda visitas e inscripciones al sorteo recién a partir del **27 de noviembre de 2026 a las 17:00** (hora de Argentina), una hora antes de la apertura. Antes de esa hora los avisos llegan pero no se guardan, así que las pruebas del equipo no ensucian los números. La hora la pone el servidor, no el celular.

La hora está en `CONTAR_DESDE`, dentro de `estadisticas/recepcion/wrangler.jsonc`, en segundos desde 1970 (`1795809600`). Para cambiarla, poné otro valor y subí el cambio; vacío significa contar siempre.

La base se dejó en cero el 25 de noviembre. Si hiciera falta vaciarla de nuevo, en la consola de la base:

```sql
SELECT COUNT(*) FROM visitas;
DELETE FROM visitas;
DELETE FROM participantes;
```

Para borrar solo lo anterior a una hora, usá `DELETE FROM visitas WHERE inicio < 1795809600;` (27/11 17:00).

## Usar el panel

- **Período:** hoy, últimos 7 días, la noche del evento (27/11 17:00 a 28/11 06:00) o fechas a elección. Antes del evento abre en "Hoy", durante la noche en el evento y después en "Todo". El registro no tiene fecha de cierre: sigue contando después del evento.
- **Descargar CSV:** las visitas del período, separadas por punto y coma y con una codificación que Excel en español abre bien.
- **Informe (PDF):** abre el cuadro de impresión del navegador; elegí "Guardar como PDF".
- **Conectados ahora:** cuenta los visitantes que tuvieron actividad en el último minuto. Se actualiza solo cada 30 segundos.

## Cómo leer los números

- Un **ingreso** es una pestaña abierta con la página. Recargar la misma pestaña no suma. Abrirla de nuevo, o volver después de media hora sin actividad, sí suma.
- Quien abre la página antes de las 18:00 del 27 y se queda mirando la cuenta regresiva también cuenta como ingreso.
- Los **visitantes únicos** son aproximados: se cuentan con un identificador anónimo guardado en cada navegador.
- La **permanencia** va desde el ingreso hasta el último aviso, y solo corre mientras la página está a la vista, con un tope de una hora por visita. Puede errar por unos segundos en cada visita.
- La **ubicación** sale de la conexión y es aproximada. Con VPN, datos móviles o el wifi del instituto puede no coincidir con el lugar real.

## Límites que conviene conocer

- La recepción solo acepta avisos con el origen `https://segon03.github.io`, pero ese dato se puede falsificar fuera de un navegador. Alguien con conocimientos técnicos podría inflar los números, aunque no podría ver datos de nadie. Si pasara, se puede agregar en Cloudflare una regla que limite los pedidos.
- Los datos quedan guardados hasta que se borren. Para borrar lo anterior a una fecha, usá `DELETE FROM visitas WHERE inicio < <segundos>` en la consola de la base.
- Si cambia la dirección del sitio (otro usuario u otro dominio), hay que actualizar `ORIGEN_PERMITIDO` en `estadisticas/recepcion/wrangler.jsonc`.

## Si algo no anda

- **No se registran visitas:** revisá que `js/estadisticas.js` tenga la dirección completa, con `/api/e` al final, y que el cambio esté en la rama que publica el sitio. Probá sin `?previa`, sin `?cuenta`, sin `?editar` y desde un navegador que no esté marcado con `?sinstats=1`.
- **El panel dice que no tiene contraseña configurada:** falta el secreto `PANEL_CLAVE` (paso 8) o tiene menos de 12 caracteres.
- **El panel vuelve a pedir la contraseña:** pasaron 12 horas o alguien cambió la contraseña. Volvé a escribirla.
- **Aparecen visitas sin provincia:** pasa con algunas conexiones. Se muestran como "Sin dato".

## Pruebas

Desde la raíz del repositorio, con Node instalado:

```
node tests/estadisticas.test.mjs
node tests/estadisticas_panel.test.mjs
node tests/estadisticas_cliente.test.cjs
NODE_PATH=$(npm root -g) node tests/e2e_estadisticas.cjs
NODE_PATH=$(npm root -g) node tests/e2e_panel.cjs
```

Las tres primeras prueban la recepción, la contraseña y la sesión del panel, el script de la página y los cálculos del panel. Las dos últimas usan Playwright: abren el micrositio como si estuviera publicada y comprueban que cuenta, que no cuenta los accesos de prueba, que sigue andando si la recepción no responde, y que el panel dibuja bien y descarga el CSV.
