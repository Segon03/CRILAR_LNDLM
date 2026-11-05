/* =====================================================================
   Datos del recorrido. Es el único archivo que hace falta editar para
   cambiar textos, nombres de salas o el contenido de cada ficha.

   escenas      cada foto del recorrido (entrada, hall, salas y sus alas)
   puntos       lo que se puede tocar dentro de una escena
                tipo "ir"      lleva a otra escena (flecha con nombre)
                tipo "objeto"  abre una ficha y cuenta para el sorteo
                tipo "info"    abre una ficha pero no cuenta para el sorteo
   x, y         posición del punto sobre la foto, en % (0 a 100)
   direccion    hacia dónde apunta una flecha: adelante, izquierda, derecha o atras
   destino      escena a la que lleva una flecha ("entrada" vuelve a la puerta)
   ficha.tipo   "foto", "infografia", "video" o "texto"
   ficha.media  foto o infografia: {"src": "images/fichas/archivo.jpg", "alt": "descripción"}
                (con {"recorte": true} se muestra un acercamiento de la propia escena)
                video: {"youtube": "ID_DEL_VIDEO"} o {"mp4": "images/fichas/video.mp4"}
   sorteo.endpoint  dirección que recibe los datos del formulario (ver README)

   Para mover los puntos con el mouse: abrí el sitio con ?editar=1 al final
   de la dirección, acomodalos y usá "Copiar datos". Pegá el resultado acá.
   ===================================================================== */
window.MUESTRA = {
  "evento": {
    "nombre": "La Noche de los Museos",
    "subtitulo": "Visita virtual a la muestra del CRILAR",
    "institucion": "CRILAR"
  },
  "inicio": "entrada",
  "sorteo": {
    "endpoint": "",
    "bases": "",
    "titulo": "Participá del sorteo",
    "gracias": "Ya estás participando. ¡Mucha suerte!"
  },
  "escenas": {
    "entrada": {
      "tipo": "puerta",
      "titulo": "Entrada",
      "imagen": {
        "src": "images/escenas/Entrada.jpeg",
        "w": 1600,
        "h": 1200
      },
      "puerta": {
        "x": 50,
        "y": 60
      },
      "siguiente": "hall"
    },
    "hall": {
      "tipo": "panorama",
      "titulo": "Hall principal",
      "corto": "Hall",
      "luz": true,
      "padre": null,
      "imagen": {
        "src": "images/escenas/Hall.jpeg",
        "w": 1600,
        "h": 424
      },
      "puntos": [
        {
          "id": "ir-sala1",
          "tipo": "ir",
          "x": 33.2,
          "y": 23.1,
          "destino": "sala1",
          "direccion": "izquierda",
          "titulo": "Sala 1",
          "detalle": "Paleontología"
        },
        {
          "id": "ir-sala2",
          "tipo": "ir",
          "x": 55.6,
          "y": 23.2,
          "destino": "sala2",
          "direccion": "derecha",
          "titulo": "Sala 2",
          "detalle": "Entomología, Botánica, Geociencias y más"
        },
        {
          "id": "dino-hall",
          "tipo": "info",
          "x": 10.5,
          "y": 47,
          "titulo": "Dinosaurio",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Dinosaurio del hall",
            "tipo": "foto",
            "media": {
              "recorte": true,
              "alt": "Detalle del dinosaurio del hall"
            },
            "texto": "Texto de ejemplo. Acá va la descripción del dinosaurio: qué especie representa, de dónde viene y por qué está en el hall.",
            "credito": ""
          }
        },
        {
          "id": "ir-entrada",
          "tipo": "ir",
          "x": 50,
          "y": 90,
          "destino": "entrada",
          "direccion": "atras",
          "titulo": "Entrada"
        }
      ]
    },
    "sala1": {
      "tipo": "escena",
      "titulo": "Sala 1, Paleontología",
      "corto": "Sala 1",
      "luz": true,
      "padre": "hall",
      "imagen": {
        "src": "images/escenas/sala1.jpeg",
        "w": 960,
        "h": 1280
      },
      "puntos": [
        {
          "id": "ir-sala1-L",
          "tipo": "ir",
          "x": 24,
          "y": 55,
          "destino": "sala1_L",
          "direccion": "izquierda",
          "titulo": "Paleontología",
          "detalle": "Ala izquierda"
        },
        {
          "id": "ir-sala1-R",
          "tipo": "ir",
          "x": 76,
          "y": 55,
          "destino": "sala1_R",
          "direccion": "derecha",
          "titulo": "Paleontología",
          "detalle": "Ala derecha"
        }
      ]
    },
    "sala1_L": {
      "tipo": "panorama",
      "titulo": "Sala 1, ala izquierda",
      "corto": "Izquierda",
      "luz": true,
      "padre": "sala1",
      "imagen": {
        "src": "images/escenas/sala1_L.jpeg",
        "w": 1140,
        "h": 464
      },
      "puntos": [
        {
          "id": "s1L-1",
          "tipo": "objeto",
          "x": 8,
          "y": 33.8,
          "titulo": "Fósil de ejemplo 1",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 1",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de fósil de ejemplo 1"
            }
          }
        },
        {
          "id": "s1L-2",
          "tipo": "objeto",
          "x": 29.8,
          "y": 28.2,
          "titulo": "Fósil de ejemplo 2",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 2",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          }
        },
        {
          "id": "s1L-3",
          "tipo": "objeto",
          "x": 47.3,
          "y": 30.3,
          "titulo": "Fósil de ejemplo 3",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 3",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          }
        }
      ]
    },
    "sala1_R": {
      "tipo": "panorama",
      "titulo": "Sala 1, ala derecha",
      "corto": "Derecha",
      "luz": true,
      "padre": "sala1",
      "imagen": {
        "src": "images/escenas/sala1_R.jpeg",
        "w": 1280,
        "h": 322
      },
      "puntos": [
        {
          "id": "s1R-1",
          "tipo": "objeto",
          "x": 20.0,
          "y": 26.7,
          "titulo": "Fósil de ejemplo 1",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 1",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de fósil de ejemplo 1"
            }
          }
        },
        {
          "id": "s1R-2",
          "tipo": "objeto",
          "x": 35.6,
          "y": 51.7,
          "titulo": "Fósil de ejemplo 2",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 2",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          }
        },
        {
          "id": "s1R-3",
          "tipo": "objeto",
          "x": 88.5,
          "y": 25.8,
          "titulo": "Fósil de ejemplo 3",
          "ficha": {
            "area": "Paleontología",
            "titulo": "Fósil de ejemplo 3",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          }
        }
      ]
    },
    "sala2": {
      "tipo": "escena",
      "titulo": "Sala 2",
      "corto": "Sala 2",
      "luz": true,
      "padre": "hall",
      "imagen": {
        "src": "images/escenas/sala2.jpeg",
        "w": 1280,
        "h": 960
      },
      "puntos": [
        {
          "id": "ir-sala2-L",
          "tipo": "ir",
          "x": 22,
          "y": 55,
          "destino": "sala2_L",
          "direccion": "izquierda",
          "titulo": "Ala izquierda",
          "detalle": "Entomología, Entomología médica, Mastozoología, Micología, Cronobiología, Ecología y Paleobotánica"
        },
        {
          "id": "ir-sala2-R",
          "tipo": "ir",
          "x": 78,
          "y": 55,
          "destino": "sala2_R",
          "direccion": "derecha",
          "titulo": "Ala derecha",
          "detalle": "Botánica y Geociencias"
        }
      ]
    },
    "sala2_L": {
      "tipo": "panorama",
      "titulo": "Sala 2, ala izquierda",
      "corto": "Izquierda",
      "luz": true,
      "padre": "sala2",
      "imagen": {
        "src": "images/escenas/sala2_L.jpeg",
        "w": 1280,
        "h": 436
      },
      "puntos": [
        {
          "id": "s2L-1",
          "tipo": "objeto",
          "x": 9.4,
          "y": 31.3,
          "titulo": "Objeto de ejemplo de Entomología",
          "ficha": {
            "area": "Entomología",
            "titulo": "Objeto de ejemplo de Entomología",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de entomología"
            }
          }
        },
        {
          "id": "s2L-2",
          "tipo": "objeto",
          "x": 16.5,
          "y": 37.4,
          "titulo": "Objeto de ejemplo de Entomología médica",
          "ficha": {
            "area": "Entomología médica",
            "titulo": "Objeto de ejemplo de Entomología médica",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          }
        },
        {
          "id": "s2L-3",
          "tipo": "objeto",
          "x": 23.3,
          "y": 47.2,
          "titulo": "Objeto de ejemplo de Mastozoología",
          "ficha": {
            "area": "Mastozoología",
            "titulo": "Objeto de ejemplo de Mastozoología",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          }
        },
        {
          "id": "s2L-4",
          "tipo": "objeto",
          "x": 35.4,
          "y": 46.6,
          "titulo": "Objeto de ejemplo de Micología",
          "ficha": {
            "area": "Micología",
            "titulo": "Objeto de ejemplo de Micología",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de micología"
            }
          }
        },
        {
          "id": "s2L-5",
          "tipo": "objeto",
          "x": 42.3,
          "y": 59.5,
          "titulo": "Objeto de ejemplo de Cronobiología",
          "ficha": {
            "area": "Cronobiología",
            "titulo": "Objeto de ejemplo de Cronobiología",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          }
        },
        {
          "id": "s2L-6",
          "tipo": "objeto",
          "x": 51.7,
          "y": 51.5,
          "titulo": "Objeto de ejemplo de Ecología",
          "ficha": {
            "area": "Ecología",
            "titulo": "Objeto de ejemplo de Ecología",
            "tipo": "video",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "youtube": "",
              "mp4": ""
            }
          }
        },
        {
          "id": "s2L-7",
          "tipo": "objeto",
          "x": 59.6,
          "y": 52.1,
          "titulo": "Objeto de ejemplo de Paleobotánica",
          "ficha": {
            "area": "Paleobotánica",
            "titulo": "Objeto de ejemplo de Paleobotánica",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de paleobotánica"
            }
          }
        }
      ]
    },
    "sala2_R": {
      "tipo": "panorama",
      "titulo": "Sala 2, ala derecha",
      "corto": "Derecha",
      "luz": true,
      "padre": "sala2",
      "imagen": {
        "src": "images/escenas/sala2_R.jpeg",
        "w": 1236,
        "h": 476
      },
      "puntos": [
        {
          "id": "s2R-1",
          "tipo": "objeto",
          "x": 74.6,
          "y": 50.5,
          "titulo": "Objeto de ejemplo de Botánica",
          "ficha": {
            "area": "Botánica",
            "titulo": "Objeto de ejemplo de Botánica",
            "tipo": "foto",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "recorte": true,
              "alt": "Detalle de objeto de ejemplo de botánica"
            }
          }
        },
        {
          "id": "s2R-2",
          "tipo": "objeto",
          "x": 92,
          "y": 62.0,
          "titulo": "Objeto de ejemplo de Geociencias",
          "ficha": {
            "area": "Geociencias",
            "titulo": "Objeto de ejemplo de Geociencias",
            "tipo": "infografia",
            "texto": "Texto de ejemplo. Acá va la descripción del objeto: qué es, de dónde viene y por qué forma parte de la muestra.",
            "credito": "",
            "media": {
              "src": "",
              "alt": ""
            }
          }
        }
      ]
    }
  },
  "version": 3
};
