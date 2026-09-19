# Próxima entrega: formulario, guía y decisiones comerciales

## Alcance de este refuerzo

Se aplican recursos DeCA enlazados desde las dos páginas centrales, comparación de versiones a partir del contenido existente, preparación de la demo, acceso directo al portal desde cabecera, pie y página de producto, y previsualizaciones PNG por tema. Se conservan formularios/APIs, artículos recién reforzados, títulos, canonical, tarifas y advertencias sobre la validación de funciones DeCA.

La tabla compara características publicadas, no acredita disponibilidades por código de la app ni establece funciones excluidas de otros planes. Planner mantiene su orientación a almacenes. Pro Intelligence sigue siendo el único recomendado.

## Portal: intervención independiente ya integrada

El PR #13 de GaunaSoftware/GaunaSoftware-transgest-app se ha integrado en el commit ac7265a631ca23f2d0541931d39c71ed7f0c4c0a. Añade X-Robots-Tag: noindex, follow únicamente para la ruta / del host transgest.app. Se verificó que la raíz sirve el acceso al workspace y que las webs públicas utilizan /web. No se alteran las rutas públicas, API, autenticación, HTML compartido, CSP ni robots.txt. El despliegue y la cabecera pública deben comprobarse tras la integración; la retirada de resultados de Google no es inmediata.

## Para resolver junto con el formulario (no activar a ciegas)

- Publicar el PDF aprobado y conectar entrega real por correo + descarga. Retirar las simulaciones de suscripción restantes. Comprobar un envío real y recepción en hola@gauna.es. La verificación del dominio no prueba por sí sola la entrega final.
- Confirmar tarifas vigentes, modalidades mensual/anual, implantación y consumos antes de publicar importes. No reutilizar precios de conversaciones antiguas.
- Incorporar capturas o grabaciones reales con datos de demostración. Obtener conformidad para cualquier testimonio/logotipo de cliente. No publicar pantallas inventadas ni capturas con datos personales.
- Verificar en el producto qué funciones DeCA están disponibles, configuradas, integradas o pendientes antes de sustituir el texto prudente de /software-deca/.
- Conectar una propiedad de analítica elegida por el titular y la gestión de consentimiento; revisar el texto de privacidad/cookies y verificar en el panel la recepción de los eventos. No hay un ID de GA4/GTM inventado en esta entrega.
- Webinar: confirmar hora, duración, ponentes, plataforma y destino de inscripción antes de crear una landing o un marcado Event. No se publica un evento incompleto.

## Base de medición de intenciones

`src/lib/navigation-intent.mjs` escucha clics en enlaces públicos y **no envía datos**. Por defecto no emite eventos. No carga etiquetas, crea cookies, usa almacenamiento, lee formularios ni reproduce clics anteriores al consentimiento.

Una futura integración de consentimiento debe emitir en cada carga:

```js
window.dispatchEvent(new CustomEvent('gauna:analytics-consent', {
  detail: { analytics: true } // solo tras permiso válido para analítica
}));
// Al revocar: analytics: false
```

El adaptador de medición, que falta conectar, puede escuchar `gauna:navigation-intent`. Los valores permitidos son acción, grupo de página, posición y, cuando existe, el nombre de un plan de la lista pública. No se transmiten URLs completas, parámetros, texto del enlace, nombre, email, teléfono ni mensajes.

Un clic hacia la demo es `navigation_intent / demo`, **no** `generate_lead`. Los contactos recibidos se medirán en la futura integración del formulario únicamente tras una respuesta válida del servidor. Evitar doble conteo con medición automática del proveedor.

## Validación y mantenimiento

GitHub Actions ejecuta las pruebas previas más las del nuevo alcance, compila Astro y verifica la tabla, metadatos, cinco PNG 1200x630, enlaces del portal y exclusión de las imágenes del sitemap HTML. No acredita posicionamiento, indexación ni entrega real de email. Las pruebas de hashes son una barrera temporal para esta entrega: se actualizan deliberadamente al abordar el formulario.

Referencias técnicas: Google Search Central, enlaces rastreables y noindex; Google Tag Platform, consentimiento; documentación Astro, endpoints estáticos. Los nuevos bloques son orientación editorial/comercial y no añaden obligaciones legales.
