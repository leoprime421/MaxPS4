# Cómo poner la página de MYA en Shopify

La página entra como una **página propia** de tu tienda, con la carta animada en computadora y la tienda en celular. Tu tema de Shopify no cambia. La página usa su propio diseño completo, sin el menú ni el pie de página del tema.

Todo lo que hay que subir está en la carpeta `shopify/`:

- `shopify/assets/`: 19 archivos (imágenes, el modelo 3D, el mapa y los programas).
- `shopify/templates/`: 2 plantillas, `page.mya-carta.liquid` para computadora y `page.mya-movil.liquid` para celular.

---

## Paso 0: haz una copia de tu tema (recomendado)

1. En el panel de Shopify, ve a **Tienda online → Temas**.
2. En tu tema actual, toca **⋯ → Duplicar**.

Si algo sale mal, puedes volver a la copia.

## Paso 1: abre el editor de código

En **Tienda online → Temas**, en tu tema actual, toca **⋯ → Editar código**.

## Paso 2: sube los 19 archivos

1. En la columna izquierda, busca la carpeta **Assets** (o **Recursos**).
2. Toca **Agregar un nuevo recurso → Cargar archivo**.
3. Sube los archivos de `shopify/assets/` uno por uno, sin cambiarles el nombre:

```
mya-belen.webp          mya-jose-360-0.webp ... mya-jose-360-7.webp
mya-collar.webp         mya-logo-base.webp
mya-mark.png            mya-logo-flap.webp
mya-modelo-3d.json      mya-provincias.json
mya-three.min.js        mya-GLTFLoader.js
mya-OrbitControls.js    mya-RoomEnvironment.js
```

## Paso 3: crea las 2 plantillas

1. En la carpeta **Templates** (o **Plantillas**), toca **Agregar una nueva plantilla**.
2. Elige **page**, tipo **liquid**, y como nombre escribe **mya-carta**. Toca **Crear plantilla**.
3. Borra todo lo que aparece, pega el contenido completo de `page.mya-carta.liquid` y toca **Guardar**.
4. Repite lo mismo con el nombre **mya-movil** y el contenido de `page.mya-movil.liquid`.

Los nombres tienen que ser exactamente `mya-carta` y `mya-movil`, porque la página los usa para cambiar entre computadora y celular.

## Paso 4: crea la página

1. Ve a **Tienda online → Páginas → Agregar página**.
2. Título: **MYA Manualidades**. El contenido puede quedar vacío.
3. A la derecha, en **Plantilla del tema**, elige **mya-carta**.
4. Toca **Guardar** y luego **Ver página**.

La dirección será algo como `https://tutienda.com/pages/mya-manualidades`.

- **En computadora** se abre la carta con la M.
- **En celular** cambia sola a la versión tienda (`?view=mya-movil`).

## Paso 5: ponla en el menú

Ve a **Tienda online → Navegación → Menú principal → Agregar elemento de menú** y elige la página **MYA Manualidades**.

---

## Lo que debes saber

- **Las compras siguen llegando por WhatsApp** (994 970 194), con el producto, el envío y la dirección, igual que ahora. Todavía no usan el carrito ni el cobro de Shopify. Si quieres cobrar con Shopify, hay que crear los productos en Shopify y conectar el botón Comprar al carrito.
- **Google y Apple:** para que el inicio de sesión sea real, sigue `LEEME-LOGIN.md` usando el dominio de tu tienda. Mientras tanto queda en modo vista previa.
- **Si cambias algo de la página más adelante**, se vuelve a generar la carpeta con `python3 tools/build_shopify.py`, y luego se reemplazan en Shopify los archivos que cambiaron.
