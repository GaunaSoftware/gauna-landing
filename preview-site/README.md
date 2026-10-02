# Preview V1 — Gauna / TransGest

Rama de diseño: `preview/transgest-storefront-v1-20261002`.

**No integrar en main. No desplegar en producción.**

## Arquitectura

Esta versión se sirve como un prototipo estático independiente. No reemplaza los archivos `src/` de la web Astro actual. La configuración de Vercel de esta rama construye exclusivamente `preview-site/` en `preview-dist/`, sin instalar dependencias ni ejecutar APIs de producción.

- `/`: presentación corporativa y ecosistema Gauna.
- `/transgest/`: producto, galería de capturas, cuatro etapas y seis áreas.
- `/transgest/precios/`: tres planes, selector mensual/anual y condiciones.
- `/transgest/contratar/`: selección, resumen económico y finalización simulada.
- `/solicitar-demo/`: formulario demostrativo, sin envío.
- `/formacion/`: estructura de academia; no es un área privada autenticada.
- `/planner/`: presentación separada, sin tarifa ni contratación.

Node 22 o posterior:

```sh
node --test preview-site/preview.test.mjs
node preview-site/build.mjs
python3 -m http.server 8000 --directory preview-dist
```

No abrir los HTML directamente con file://: los enlaces y recursos utilizan rutas desde la raíz del servidor.

## Seguridad y producción

El build falla deliberadamente si `VERCEL_ENV=production` o `VERCEL_GIT_COMMIT_REF=main`. No retirar ese bloqueo sin aprobación explícita. No modificar dominios ni la rama de producción en Vercel.

Meta robots y X-Robots-Tag: noindex, nofollow, noarchive. Robots.txt: Disallow: /. No se genera sitemap ni canonical de producción. Estos controles de indexación no son autenticación; el contenido publicado está preparado para poder ser visto sin datos privados.

CSP bloquea conexiones de JavaScript (`connect-src none`) y envíos de formulario (`form-action none`). No hay SDK de pagos, endpoints, cuentas reales, emails, trackers, cookies ni almacenamiento persistente. Los campos de empresa son de solo lectura y contienen datos ficticios.

## Tarifa utilizada

Fuente: tarifa profesional TransGest aportada por el propietario, septiembre 2026. Los importes se almacenan en céntimos en `app.mjs`.

| Plan | Mensual | Anual final (-15 %) | Integración estándar |
|---|---:|---:|---:|
| Go | 169 EUR | 1723,80 EUR | 1500 EUR |
| Pro | 349 EUR | 3559,80 EUR | 1500 EUR |
| Pro Intelligence | 479 EUR | 4885,80 EUR | Incluida |

Todos los importes son sin IVA. El equivalente mensual de la opción anual no representa facturación mensual. El total anual aparece expresamente. La integración se separa como puesta en marcha y no recibe el descuento de suscripción. El IVA no se calcula en este prototipo.

Pro Intelligence: 1000 consultas IA/mes. Bloques adicionales: 49 EUR por 500 consultas/mes. Almacenamiento documental para uso empresarial normal; ampliación de gran volumen 39 EUR por 100 GB/mes. Nuevos conectores, desarrollos y servicios externos: según alcance. No se venden automáticamente esos extras.

No se incorpora el antiguo plan Control. Planner tiene una presentación separada sin precio. MarGest/AirGest no se presentan como productos disponibles.

## Capturas y privacidad

Únicamente se incluyen cinco derivados AVIF anonimizados. Se han recortado o sustituido con relleno opaco los datos identificativos: usuarios, empresas, clientes, conductores, matrículas, referencias y datos financieros. Los importes y el gráfico de informes se han reemplazado por datos ficticios. Cada imagen queda aplanada y lleva una leyenda de demostración. No se publican archivos originales ni capas que permitan recuperar los datos tapados.

La nueva mesa es la vista aportada por el propietario; su disponibilidad en producción no ha sido comprobada y se identifica así. No se presenta el prototipo como prueba de funciones desplegadas.

## Vídeos pendientes

No se han recibido grabaciones. La galería es un recorrido de capturas, no un vídeo. Los campos `media[key].clip` permanecen en null. El diálogo acepta vídeos locales cuando se incorporen grabaciones revisadas y sin información sensible. Cuatro espacios de proceso están previstos para piezas de 60–90 s. La vista documental y el esquema Intelligence son ilustrativos y están etiquetados como tales.

Para producción: incorporar clips reales, validar accesibilidad/subtítulos y carga diferida; conectar pasarela en entorno de pruebas, validar precio en servidor, impuestos, contratos, webhooks idempotentes y alta/onboarding. Requiere aprobación posterior, fuera del alcance de esta preview.

## Validación realizada

Pruebas unitarias de importes, integración, rutas, identidad y ausencia de envío real. Inspección de renderizado offline con Chromium: seis rutas a 1440, 390 y 360 px, imágenes, desbordamiento, selector de precios, cambio de plan, simulación, pestañas, apertura y cierre de capturas. La inspección offline no equivale a una prueba HTTP completa de la URL desplegada. Los originales privados y el harness local no se incluyen en este repositorio.
