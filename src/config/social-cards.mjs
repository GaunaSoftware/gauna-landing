import { normalizePath } from './public-site.mjs';

// Editorial previews, not product screenshots or regulatory certificates.
export const SOCIAL_CARDS = {
  gauna: { eyebrow: 'GAUNA SOFTWARE', lines: ['Software creado', 'desde el transporte.'], subtitle: 'Conecta tu operativa con TransGest.', footer: 'gauna.es', alt: 'Gauna Software: software especializado en transporte' },
  transgest: { eyebrow: 'TMS PARA EMPRESAS DE TRANSPORTE', lines: ['Menos tareas sueltas.', 'Más control operativo.'], subtitle: 'Tráfico, documentación y administración conectados.', footer: 'gauna.es/transgest', alt: 'TransGest: tráfico, documentación y administración conectados' },
  deca: { eyebrow: 'GUÍA DeCA 2026', lines: ['Entiende el cambio.', 'Revisa tu operativa.'], subtitle: 'Documento de control: requisitos y recursos prácticos.', footer: 'gauna.es/deca-2026', alt: 'Guía DeCA 2026: requisitos del documento y cumplimiento actual' },
  albaranes: { eyebrow: 'GESTIÓN DOCUMENTAL DEL TRANSPORTE', lines: ['Digitaliza albaranes.', 'Conecta cada entrega.'], subtitle: 'Del servicio a la validación, el archivo y la facturación.', footer: 'gauna.es/blog', alt: 'Digitalización de albaranes: del servicio a la facturación' },
  tms: { eyebrow: 'GUÍA DE GESTIÓN DEL TRANSPORTE', lines: ['Qué es un TMS', 'y cómo elegirlo.'], subtitle: 'Del pedido a la documentación y al análisis.', footer: 'gauna.es/blog', alt: 'Qué es un TMS de transporte y cómo evaluar un software de gestión' },
  planes: { eyebrow: 'VERSIONES TRANSGEST', lines: ['Elige por tu operativa.', 'No por tu flota.'], subtitle: 'Go · Pro · Pro Intelligence', footer: 'gauna.es/transgest/precios', alt: 'Comparación del enfoque de las versiones TransGest' },
};

export function socialCardKey(pathname) {
  const path = normalizePath(pathname);
  if (path === '/blog/digitalizacion-albaranes-transporte/') return 'albaranes';
  if (path === '/transgest/precios/') return 'planes';
  if (path === '/blog/que-es-un-tms-transporte/') return 'tms';
  if (path === '/deca-2026/' || path === '/software-deca/' || /^\/blog\/(deca-|que-es-deca-|requisitos-tecnicos-deca-|resolucion-deca-)/.test(path)) return 'deca';
  if (path === '/transgest/' || path === '/solicitar-demo/') return 'transgest';
  return 'gauna';
}
export function socialImage(pathname) { return `/og/${socialCardKey(pathname)}.png`; }
