"""Calcula los cortes de línea y el tamaño de letra del Tablero de luz.

Lee las preguntas (pt) y respuestas (r) de datos/muestra.js, mide cada palabra con
la tipografía Atkinson Hyperlegible Bold que usa el sitio y busca el tamaño más grande
con el que TODAS las preguntas (y, aparte, todas las respuestas) entran dentro de su
círculo. Escribe datos/tablero-lineas.js. Así el navegador no tiene que medir nada.

Uso:  python3 herramientas/tablero_lineas.py      (necesita: pip install fonttools brotli; y node)
"""
import itertools, json, math, subprocess, pathlib
from fontTools.ttLib import TTFont

RAIZ = pathlib.Path(__file__).resolve().parent.parent
FUENTE = RAIZ / 'fonts/atkinson-hyperlegible-latin-700-normal.woff2'
INTERLINEA = 1.16      # alto de línea / tamaño de letra
SEGURIDAD = 1.04       # margen por diferencias de dibujo entre navegadores
BORDE = {'p': 12, 'r': 10}   # grosor del anillo (unidades del tablero)

f = TTFont(str(FUENTE))
UPM = f['head'].unitsPerEm
CMAP = f.getBestCmap()
HMTX = f['hmtx']

def ancho(txt, t):
    u = 0
    for ch in txt:
        g = CMAP.get(ord(ch)) or CMAP.get(ord('?'))
        u += HMTX[g][0]
    return u / UPM * t * SEGURIDAD

def acomodar(texto, d, t, borde, maxl=8):
    """Devuelve las líneas si el texto entra con tamaño t en un círculo de diámetro d; si no, None."""
    lim = d / 2 - borde - d * 0.045
    palabras = texto.split()
    lh = t * INTERLINEA
    for n in range(1, maxl + 1):
        H = n * lh
        if H > 2 * lim:
            return None
        # ancho disponible de cada renglón (cuerda del círculo en su borde más alejado del centro)
        disp = []
        for i in range(n):
            y0 = -H / 2 + i * lh
            y = max(abs(y0), abs(y0 + lh))
            disp.append(2 * math.sqrt(max(0, lim * lim - y * y)))
        # se prueban todos los cortes posibles y se elige el más parejo
        mejor_c, mejor_v = None, None
        for cortes in itertools.combinations(range(1, len(palabras)), n - 1):
            ls = [' '.join(palabras[a:b]) for a, b in zip((0,) + cortes, cortes + (len(palabras),))]
            uso = [ancho(l, t) / disp[i] if disp[i] > 0 else 9 for i, l in enumerate(ls)]
            if max(uso) <= 1 and (mejor_v is None or max(uso) - min(uso) < mejor_v):
                mejor_c, mejor_v = ls, max(uso) - min(uso)
        if mejor_c:
            return mejor_c
    return None

def mejor(textos, diam, borde, tmax, maxl=8):
    t = tmax
    while t >= 8:
        res = [acomodar(x, d, t, borde, maxl) for x, d in zip(textos, diam)]
        if all(res):
            return t, res
        t -= 0.5
    raise SystemExit('No entra el texto ni con letra 8')

js = subprocess.run(['node', '-e', "global.window={};require('./datos/muestra.js');"
    "const s=window.MUESTRA.escenas;for(const k in s)for(const p of (s[k].puntos||[]))"
    "if(p.ficha&&p.ficha.tipo==='tablero')console.log(JSON.stringify(p.ficha.tablero));"],
    cwd=RAIZ, capture_output=True, text=True, check=True).stdout
cfg = json.loads(js.strip().splitlines()[0])
pares = cfg['pares']
tp, lp = mejor([p.get('pt') or p['p'] for p in pares], [p['pc'][2] for p in pares], BORDE['p'], 40)
tr, lr = mejor([p['r'] for p in pares], [p['rc'][2] for p in pares], BORDE['r'], 52, 2)
# barra verde de abajo: dos renglones en 1300 unidades de ancho
def barra(txt):
    pal = txt.split()
    for t in range(42, 20, -1):
        for c in range(1, len(pal)):
            a, b = ' '.join(pal[:c]), ' '.join(pal[c:])
            if ancho(a, t) <= 1300 and ancho(b, t) <= 1300 and (ancho(b, t) <= ancho(a, t)):
                return t, [a, b]
    return 24, [txt]
tb, lb = barra(cfg.get('barra', ''))
salida = {'letraP': tp, 'letraR': tr, 'interlinea': INTERLINEA, 'p': lp, 'r': lr, 'letraBarra': tb, 'barra': lb}
(RAIZ / 'datos/tablero-lineas.js').write_text(
    '/* Generado por herramientas/tablero_lineas.py: no editar a mano. */\n'
    'window.TABLERO_LINEAS = ' + json.dumps(salida, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
print('pregunta', tp, 'respuesta', tr)
for x in lp: print(' | '.join(x))
for x in lr: print(' | '.join(x))
