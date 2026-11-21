# Inicio de sesión con Google y Apple

Mientras no pongas tus identificadores, los botones de Google y Apple funcionan en **modo vista previa**: piden un nombre para probar el recorrido y no se conectan a ninguna cuenta real.

Para activarlos de verdad, la página tiene que estar publicada en tu propio dominio con `https` (por ejemplo `https://myamanualidades.pe`). En la vista de Claude no se pueden cargar los servicios de Google ni de Apple.

Los dos identificadores están al inicio de la sección `cuentas: Google / Apple` en `carta.html` y en `movil.html`:

```js
const GOOGLE_CLIENT_ID = '';
const APPLE_CLIENT_ID = '';
```

## Google

1. Entra a <https://console.cloud.google.com/> y crea un proyecto.
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth** y complétala con el nombre "MYA Manualidades".
3. Ve a **Credenciales → Crear credenciales → ID de cliente de OAuth** y elige el tipo **Aplicación web**.
4. En **Orígenes de JavaScript autorizados**, agrega tu dominio, por ejemplo `https://myamanualidades.pe`.
5. Copia el ID de cliente (termina en `.apps.googleusercontent.com`) y pégalo en `GOOGLE_CLIENT_ID` en los dos archivos.

## Apple

Necesitas una cuenta de Apple Developer, que cuesta 99 USD al año.

1. En <https://developer.apple.com/account/resources/identifiers> crea un **App ID** con "Sign in with Apple" activado.
2. Crea un **Services ID**, por ejemplo `pe.myamanualidades.web`, y en su configuración de "Sign in with Apple" agrega:
   - **Domains**: `myamanualidades.pe`
   - **Return URLs**: la dirección exacta de la página, por ejemplo `https://myamanualidades.pe/`
3. Pega el Services ID en `APPLE_CLIENT_ID` en los dos archivos.

## Dónde se guarda la dirección

La dirección de cada cliente se guarda **en su propio navegador**, vinculada a su cuenta de Google o Apple. Si el cliente entra desde otro celular o computadora, tendrá que escribirla otra vez.

Si quieres que la dirección quede guardada en todos sus aparatos, o ver tú las direcciones de tus clientes, hace falta un servidor o una tienda con cuentas de clientes, como Shopify.

## Datos de provincias y distritos

Las provincias y los distritos salen de `provincias.json`. Ese archivo se armó con los datos públicos de <https://github.com/juaneladio/peru-geojson>. Algunos nombres vienen sin tilde, por ejemplo "La Convencion".
