// Public navigation only. No credentials, tariffs or product entitlement rules.
export const CLIENT_PORTAL_URL = 'https://transgest.app/';

export const DECA_RESOURCES = [
  { href: '/blog/que-es-deca-transporte/', title: 'Qué es el DeCA en transporte', description: 'Empieza por el significado del documento y el alcance del cambio digital.' },
  { href: '/blog/requisitos-tecnicos-deca-pdf-qr-url/', title: 'Requisitos del PDF, QR y URL', description: 'Consulta las características técnicas y los puntos que debes comprobar en el acceso al documento.' },
  { href: '/blog/deca-para-transportistas-y-flotas/', title: 'DeCA para transportistas y flotas', description: 'Relaciona la documentación con el trabajo de tráfico, administración y conductores.' },
  { href: '/blog/deca-ecmr-diferencias/', title: 'Diferencias entre DeCA y eCMR', description: 'Distingue el control administrativo de la carta de porte electrónica antes de integrar documentos.' },
  { href: '/blog/resolucion-deca-5-junio-2026/', title: 'La resolución de 5 de junio de 2026', description: 'Revisa qué regula esta resolución y dónde consultar sus fuentes oficiales.' },
  { href: '/blog/que-es-un-tms-transporte/', title: 'Qué es un TMS de transporte', description: 'Entiende cómo conectar el expediente documental con la gestión de los servicios.' },
];

export const RESOURCE_HUB_PATHS = ['/deca-2026/', '/software-deca/'];
export const PRODUCT_EVALUATION_PATHS = ['/transgest/', '/software-deca/'];
export const PLAN_NAMES = ['Go', 'Control', 'Pro', 'Pro Intelligence', 'Planner'];

export function normalizePath(pathname) {
  const path = String(pathname || '/').split(/[?#]/, 1)[0];
  return path === '/' ? '/' : `${path.replace(/\/+$/, '')}/`;
}

export function planAnchor(name) {
  return `plan-${String(name).toLowerCase().replace(/\s+/g, '-')}`;
}
