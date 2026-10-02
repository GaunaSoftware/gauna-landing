# Gauna / TransGest — preview comercial V1

Rama: `preview/transgest-store-20261002`. Base main: `43e40194dde3ebd3f2702e6da5fff9cf9b29d820`.

**NO fusionar en main. NO desplegar con `--prod`.** La configuración de Vercel de esta rama construye solo este prototipo estático. El build falla si `VERCEL_ENV=production` o `VERCEL_GIT_COMMIT_REF=main`. La aplicación Astro y todos los contenidos actuales de `src/` se mantienen intactos.

## Ejecutar

Requiere Node 22. Sin dependencias adicionales:

```sh
node preview-site/build.mjs
node --test preview-site/tests/*.test.mjs
python -m http.server 8765 --directory preview-site/dist
```

Rutas: `/`, `/transgest/`, `/transgest/precios/`, `/transgest/contratar/`, `/transgest/formacion/`, `/planner/`, `/revision/`.

## Materiales y privacidad

Solo se distribuyen imágenes anonimizadas y aplanadas. No se deben añadir las capturas originales al repositorio, ni ocultar datos únicamente por CSS, desenfoque reversible o capas SVG. Los datos de ejemplo se identifican como ilustrativos. La nueva mesa es el diseño facilitado por el propietario: verificar su implantación en el producto antes de quitar esa identificación. Las cifras del gráfico fueron sustituidas, no se exponen series financieras reales.

El recorrido visual de la cabecera cambia capturas. **No es un vídeo de operativas ni prueba velocidades de ejecución.** Se pausa desde el botón, al ocultar la pestaña y respeta movimiento reducido/ahorro de datos. Los vídeos reales aún no han sido aportados; `catalog.mjs` deja `videoSrc` y `captionsSrc` vacíos.

`restore-assets.mjs` valida y reconstituye dos imágenes de demostración a partir de cargas binarias de transporte, verificando su hash exacto. Las cargas no se copian al sitio generado. No contienen las capturas originales.

## Tarifa utilizada

Documento suministrado: Tarifa profesional TransGest, septiembre 2026.
- Go: 169 €/mes o 1.723,80 €/año; integración estándar 1.500 € adicional.
- Pro: 349 €/mes o 3.559,80 €/año; integración estándar 1.500 € adicional.
- Pro Intelligence: 479 €/mes o 4.885,80 €/año; integración estándar incluida; 1.000 consultas IA/mes.
- IA extra Intelligence: 49 €/500 consultas/mes. Almacenamiento extraordinario: 39 €/100 GB/mes.
- Descuento anual de 15 % solo en suscripción; integración no bonificada en Go/Pro anual.
- IVA no incluido. No se inventa un IVA final sin definir jurisdicción fiscal.
- Extras mostrados con periodicidad mensual, incluido el primer mes en el total inicial; no se infiere descuento de extras ni cobro anual no acordado.
- Nuevos conectores, desarrollos a medida y servicios externos requieren presupuesto.
- Planner separado, sin tarifa: no estaba incluido en el documento. MarGest/AirGest no son productos a la venta.

## Contratación

Es una máquina de estados local y **no una pasarela de pago operativa**. No se solicitan datos de tarjeta. Los datos de empresa son ejemplos bloqueados. No hay peticiones de red desde la lógica de contratación, cookies, almacenamiento local, email, API, alta de cuentas ni aceptación contractual real.

Antes de activar ventas: proveedor y claves de pago de pruebas, alta de empresa/usuario, facturación e impuestos, consentimiento y contrato, prorrateos/cancelaciones, alcance de integración estándar, webhooks verificados e idempotentes, emails transaccionales y pruebas end-to-end en sandbox. Nunca añadir claves al repositorio. No quitar guardas ni cambiar los botones de simulación antes de resolver estos puntos.

## Material pendiente

1. Grabación de 15–25 s para la cabecera (operativas reales, sin sonido, datos demo).
2. Cuatro clips de proceso (objetivo ~90 s): pedido, planificación, seguimiento, facturación/análisis. Versiones breves opcionales.
3. Captura y clip del expediente/documentación. No se ha inventado esa pantalla.
4. Clip real de funciones de IA. No utilizar un gráfico de KPIs como prueba de IA.
5. Confirmación de la nueva mesa de tráfico en el producto, condiciones de compra definitivas e infraestructura de pago de pruebas.

La inspiración es de estructura y presentación (Apple/iPhone, Dashdoc, Cadenia), sin copiar textos, activos, logos de clientes ni métricas de terceros.

## Validación

Seis pruebas Node: tarifa, descuentos/extras/integración, valores inválidos, siete rutas y activos, bloqueo de producción y ausencia de recogida de datos/cobros. Interacciones también comprobadas mediante renderizado local de HTML/CSS/JS en Chromium. La navegación de red del navegador del entorno no ha estado disponible; no se afirma una comprobación end-to-end de producción.
