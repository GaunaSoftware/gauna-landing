# Guía DeCA, formularios y próximos materiales

## Decisión comercial definitiva

NO publicar precios, tarifas ni importes comerciales, ni en contenido visible ni en datos estructurados. No es una tarea pendiente. Se comparan versiones y funcionalidades; Pro Intelligence sigue como único recomendado.

## Edición aprobada incorporada

El titular ha subido el PDF profesional. Se conserva el blob 5a8303e440cd8936c842cf62846ffc5cf09bb55b sin regenerar contenido ni logos y se coloca en public/guias/guia-deca-2026-gauna-v2.1.pdf para coincidir con el enlace del formulario y del correo.

28 páginas, 974002 bytes, SHA-256 74b1e666580a019ab0ce76718226ea84f06b496f99fc738dc4297071368baf62. scripts/verify-guide.mjs bloquea una publicación si no coincide. El archivo antiguo DCD no forma parte de esta entrega.

## Flujo de solicitud

/api/guia-deca exige nombre/email y consentimiento de entrega; empresa y perfil son opcionales. Envía un correo transaccional con el enlace al PDF y un aviso independiente a hola@gauna.es. El contacto comercial tiene una casilla separada, opcional y desmarcada. No hay suscripción automática a publicidad ni newsletter. La descarga directa permanece disponible y no genera aviso de lead por sí sola.

/api/informacion-deca sustituye beta/Airtable en la página de software DeCA. No envía automáticamente la guía. Se conservan /api/contact y los formularios de contacto y demo. Las antiguas suscripciones simuladas se sustituyen por un enlace al recurso.

El backend valida origen, formato/tamaño, campos, consentimiento y Turnstile (hostname/action y fallo seguro sin claves). Las peticiones a Resend tienen idempotencia estable por solicitud y mensaje. Los resultados del correo al lector y del aviso interno se presentan por separado. El límite de intentos en memoria es básico y por instancia, no distribuido.

## Verificaciones de la entrega

Antes de integrar: pruebas unitarias, compilación, hash/tamaño/páginas del PDF y navegador a 390 y 1280 píxeles. El navegador prueba descarga, consentimiento, campos opcionales, errores, resultados parciales y reintentos sin perder datos. CAPTCHA y respuesta de correo se simulan; no se introducen claves reales ni se envían mensajes de prueba a terceros.

Después de integrar: scripts/verify-guide-live.mjs verifica por GET el PDF público (200, application/pdf, tamaño y SHA-256), el formulario renderizado y el rechazo de GET por las dos API. Esta comprobación no envía correo.

El envío real con CAPTCHA válido y la recepción en el buzón del solicitante y en hola@gauna.es requieren la última prueba del titular. La aceptación por Resend no demuestra recepción en bandeja de entrada. Registrar en el PR los resultados reales del despliegue y de las pruebas; no dar por terminada esta comprobación de correo antes de confirmarla.

## Pendientes con materiales o acceso del titular

- Capturas/grabaciones reales con datos de demostración y validación funcional DeCA antes de modificar afirmaciones comerciales.
- Cuenta de analítica y gestión del consentimiento. El puente de intenciones sigue inactivo, sin proveedor ni cookies.
- Webinar: hora, duración, ponentes, plataforma y destino de inscripción.
- Revisar textos/proveedores de privacidad al activar nuevas finalidades; no suscribir solicitantes automáticamente.

## Cambios anteriores preservados

Enlazado DeCA, comparación de versiones, navegación al portal, imágenes sociales, títulos y canonical. Noindex del acceso transgest.app se gestiona solo en el repositorio de la aplicación.
