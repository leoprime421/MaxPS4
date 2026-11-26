# MYA Manualidades — código de la página

## Abrir la página en tu computadora
Los navegadores no dejan cargar algunos archivos (mapa de provincias, modelo 3D) abriendo el HTML con doble clic.
Abre una terminal en esta carpeta y ejecuta:

    python3 -m http.server 8000

Luego entra a http://localhost:8000 en tu navegador.

## Archivos
| Archivo / carpeta | Qué es |
|---|---|
| `index.html` | Entrada: detecta si es celular o computadora y abre la versión correcta |
| `carta.html` | Versión computadora (la M que se abre como carta) |
| `movil.html` | Versión celular (tienda con el logo que se achica) |
| `provincias.json` | Provincias y distritos del Perú para el mapa |
| `img/` | Logo, fotos, vistas 360° y modelo 3D |
| `lib/` | three.js para el visor 3D |
| `shopify/` | Versión para Shopify: `assets/`, `templates/` y `layout/` (la que está publicada en tu tienda) |
| `tools/build_shopify.py` | Genera la carpeta `shopify/` a partir de `carta.html` y `movil.html` |
| `SHOPIFY.md`, `LEEME-LOGIN.md` | Guías de Shopify y del inicio de sesión |

## Datos que puedes cambiar (en carta.html y movil.html)
- WhatsApp: `const WHATSAPP`
- Yape / Plin: `const PAGOS`
- Productos del celular: `const PRODUCTOS` (en movil.html)
