# Estadísticas de uso: cómo publicarlas

Esta carpeta tiene lo necesario para registrar de forma anónima cuántas visitas tiene la visita virtual, cuánto tiempo se quedan, a qué hora entran y desde qué provincia y país. El plan completo está en `PLAN_ESTADISTICAS.md`, en la raíz del repositorio.

El mismo servicio sirve también para la app de la vitrina (`Segon03/muestra_crilar`). Cada visita se guarda con el nombre de la página de la que vino (`museo` o `vitrina`) y el panel permite ver las dos juntas o por separado.

## Qué hay

- `recepcion/`: servicio público que recibe los avisos de las páginas y los guarda. Solo puede escribir.
- `panel/`: el panel privado. Solo puede leer. Queda detrás de un login (Cloudflare Access).
- `schema.sql`: la tabla de visitas.
- `compartido/`: validaciones y verificación del login, que usan los dos servicios.

En la visita virtual, los avisos salen de `js/estadisticas.js`. Mientras la línea `var ENDPOINT = '';` de ese archivo esté vacía, las estadísticas están apagadas: la página no envía nada ni muestra el aviso de privacidad.

## Qué se guarda y qué no

Cada visita es una fila con: un identificador anónimo de la visita, un identificador anónimo del navegador, la página (museo o vitrina), la hora de entrada, la hora del último aviso, el país y la provincia. No se guarda la IP, la ciudad, el dispositivo, el nombre ni nada que identifique a una persona.

## Antes de empezar

Todo se hace desde la página de Cloudflare, sin instalar nada en la computadora. Los nombres de los botones pueden cambiar un poco según cuándo lo mires. Calculá entre 30 y 40 minutos.

Los servicios se publican solos desde GitHub cada vez que cambia la rama elegida. Conviene elegir la misma rama que publica el sitio (hoy, `pruebas`, una vez que se una esta rama).

## Parte A: recepción (lo mínimo para empezar a contar)

1. **Cuenta.** Creá una cuenta gratuita en cloudflare.com.
2. **Base de datos.** En el menú, entrá a *Storage & databases > D1 SQL database* y creá una base llamada `crilar-estadisticas`. Dentro de la base, abrí la pestaña *Console*, pegá el contenido de `estadisticas/schema.sql` y ejecutalo. Copiá el *Database ID* que aparece en la base.
3. **ID de la base en el código.** En `estadisticas/recepcion/wrangler.jsonc` y en `estadisticas/panel/wrangler.jsonc`, reemplazá `REEMPLAZAR_POR_EL_ID_DE_LA_BASE` por ese ID. No es un secreto.
4. **Publicar la recepción.** En *Workers & Pages*, elegí *Create > Import a repository*, conectá GitHub, autorizá el repositorio `Segon03/CRILAR_LNDLM` y completá:
   - Nombre del proyecto: `crilar-recepcion` (tiene que ser igual al `name` de `wrangler.jsonc`).
   - Rama: la que publica el sitio.
   - Directorio raíz: `estadisticas/recepcion`.
   - Comando de despliegue: el que viene por defecto (`npx wrangler deploy`).

   Cuando termine, copiá la dirección que termina en `.workers.dev`.
5. **Encender las estadísticas.** En `js/estadisticas.js`, cambiá la línea `var ENDPOINT = '';` por la dirección del paso anterior seguida de `/api/e`, por ejemplo:

   ```js
   var ENDPOINT = 'https://crilar-recepcion.TU-SUBDOMINIO.workers.dev/api/e';
   ```

   En `index.html`, subí el número de `js/estadisticas.js?v=1` a `?v=2` para que los celulares no usen la copia vieja. Subí los dos cambios a la rama que publica el sitio. Unos minutos después, las estadísticas quedan encendidas.
6. **Probar.** Abrí la página desde un celular (sin `?previa`, ver abajo), esperá unos segundos y en la consola de la base ejecutá:

   ```sql
   SELECT datetime(inicio, 'unixepoch', '-3 hours') AS entrada, sitio, ultimo - inicio AS segundos, pais, provincia FROM visitas ORDER BY inicio DESC LIMIT 5;
   ```

   Tiene que aparecer una fila nueva con `museo`, el país y la provincia. A veces la provincia queda vacía, según la conexión.

## Parte B: panel privado

7. **Publicar el panel.** Igual que el paso 4, con estos datos:
   - Nombre del proyecto: `crilar-panel`.
   - Directorio raíz: `estadisticas/panel`.
8. **Activar el login.** En Cloudflare, abrí *Zero Trust* y creá el equipo con el plan gratuito. Puede pedir una tarjeta para verificar el alta aunque no cobre nada. Después, en *Workers & Pages > crilar-panel > Settings > Domains & Routes*, activá *Cloudflare Access* en la dirección `workers.dev`. Al activarlo aparecen dos datos: el dominio del equipo (algo como `tuequipo.cloudflareaccess.com`) y el *AUD tag*. Copiá los dos.
9. **Quién puede entrar.** En *Zero Trust > Access > Applications*, abrí la aplicación que se creó y, en su política de tipo *Allow*, dejá como único permitido el correo `segundo.nc@conicet.gov.ar`. No uses una regla por dominio (`@conicet.gov.ar`), porque dejaría entrar a cualquier persona con correo del CONICET.
10. **Datos de Access en el código.** En `estadisticas/panel/wrangler.jsonc`, completá `ACCESS_TEAM_DOMAIN` con el dominio del equipo (sin `https://`) y `ACCESS_AUD` con el AUD tag. No son secretos. Al subir el cambio, el panel se vuelve a publicar solo. Mientras estén vacíos, el panel responde "Acceso denegado" a todos, a propósito.
11. **Probar.** Abrí la dirección del panel en una ventana privada. Tiene que pedirte el correo y mandarte un código. Con un correo que no está autorizado no tiene que dejarte entrar.

### Sumar más correos después

No hace falta tocar el código. En *Zero Trust > Access > Applications*, abrí la aplicación del panel, editá la política *Allow* y agregá los correos de a uno. Rigen en el momento.

## La app de la vitrina

Para que la app de la vitrina (`muestra_crilar`) cuente en este mismo panel, su script tiene que enviar la recepción de este repositorio y el campo `si: 'vitrina'`. Esa app tiene sus propios pasos en su repositorio. Si alguna vez llegan avisos sin página, el panel los muestra como "Sin dato".

## Qué visitas no se cuentan

- Las que llevan `?previa`, `?cuenta` o `?editar` en la dirección: son los accesos de prueba del equipo.
- Las de un navegador marcado con `?sinstats=1`. Abrí la página una vez así en cada equipo de prueba y queda excluido para siempre. Con `?sinstats=0` se vuelve a contar.
- Las abiertas con doble clic desde la computadora o desde `localhost`.

Ojo: `?previa=1` también queda recordado en el navegador para saltear la cuenta regresiva, pero las estadísticas solo lo excluyen cuando está escrito en la dirección. Si querés que un equipo de prueba no cuente nunca, usá además `?sinstats=1`.

Los enlaces directos a una sala (`?escena=...`) sí cuentan, porque pueden llegarle a un visitante real.

## Antes del evento: borrar los datos de prueba

Las pruebas que hagas antes del evento cuentan como visitas. Para dejar el panel en cero, en la consola de la base ejecutá:

```sql
DELETE FROM visitas WHERE inicio < 1795748400;
```

`1795748400` es el 27 de noviembre de 2026 a las 00:00, hora de Argentina. Antes, revisá cuántas filas va a borrar con `SELECT COUNT(*) FROM visitas WHERE inicio < 1795748400;`.

Si preferís borrar solo lo anterior a la apertura de la visita (18:00 del 27), usá `1795813200` en lugar de `1795748400`.

## Usar el panel

- **Período:** hoy, últimos 7 días, la noche del evento (27/11 00:00 a 28/11 06:00) o fechas a elección. Antes del evento abre en "Hoy"; desde el inicio del evento abre en la noche completa.
- **Página:** ambas, solo la visita virtual o solo la vitrina. Con "Ambas páginas" se ve además cuántos ingresos tuvo cada una.
- **Descargar CSV:** las visitas del período y de la página elegida, separadas por punto y coma y con una codificación que Excel en español abre bien.
- **Informe (PDF):** abre el cuadro de impresión del navegador; elegí "Guardar como PDF".
- **Conectados ahora:** cuenta los visitantes que tuvieron actividad en el último minuto. Se actualiza solo cada 30 segundos.

## Cómo leer los números

- Un **ingreso** es una pestaña abierta con la página. Recargar la misma pestaña no suma. Abrirla de nuevo, o volver después de media hora sin actividad, sí suma.
- Quien abre la página antes de las 18:00 del 27 y se queda mirando la cuenta regresiva también cuenta como ingreso.
- Los **visitantes únicos** son aproximados: se cuentan con un identificador anónimo guardado en cada navegador. Como las dos páginas comparten dirección (`segon03.github.io`), la misma persona tiene el mismo identificador en las dos.
- La **permanencia** va desde el ingreso hasta el último aviso, y solo corre mientras la página está a la vista, con un tope de una hora por visita. Puede errar por unos segundos en cada visita.
- La **ubicación** sale de la conexión y es aproximada. Con VPN, datos móviles o el wifi del instituto puede no coincidir con el lugar real.

## Límites que conviene conocer

- La recepción solo acepta avisos con el origen `https://segon03.github.io`, pero ese dato se puede falsificar fuera de un navegador. Alguien con conocimientos técnicos podría inflar los números, aunque no podría ver datos de nadie. Si pasara, se puede agregar en Cloudflare una regla que limite los pedidos.
- Los datos quedan guardados hasta que se borren. Para borrar lo anterior a una fecha, usá `DELETE FROM visitas WHERE inicio < <segundos>` en la consola de la base.
- Si cambia la dirección del sitio (otro usuario u otro dominio), hay que actualizar `ORIGEN_PERMITIDO` en `estadisticas/recepcion/wrangler.jsonc`.

## Si algo no anda

- **No se registran visitas:** revisá que `js/estadisticas.js` tenga la dirección completa, con `/api/e` al final, y que el cambio esté en la rama que publica el sitio. Probá sin `?previa`, sin `?cuenta`, sin `?editar` y desde un navegador que no esté marcado con `?sinstats=1`.
- **El panel dice "Acceso denegado":** faltan o están mal `ACCESS_TEAM_DOMAIN` o `ACCESS_AUD`, o el correo no figura en la política *Allow*. Cerrá la sesión (ventana privada) y volvé a entrar.
- **El panel dice "Sin acceso" después de un rato:** venció la sesión. Recargá la página.
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

Las tres primeras prueban la recepción, el login, el script de la página y los cálculos del panel. Las dos últimas usan Playwright: abren la visita virtual como si estuviera publicada y comprueban que cuenta, que no cuenta los accesos de prueba, que sigue andando si la recepción no responde, y que el panel dibuja y filtra bien.
