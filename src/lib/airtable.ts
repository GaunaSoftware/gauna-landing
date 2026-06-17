```ts
import Airtable from 'airtable';

// Variables de entorno configuradas en Vercel y en .env local
const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
const AIRTABLE_BETA_TABLE = import.meta.env.AIRTABLE_BETA_TABLE || 'BetaTesters';

// Usamos la misma tabla para solicitudes de demo.
// Si algún día creas otra tabla, puedes añadir en Vercel:
// AIRTABLE_DEMO_TABLE=SolicitudesDemo
const AIRTABLE_DEMO_TABLE =
  import.meta.env.AIRTABLE_DEMO_TABLE || AIRTABLE_BETA_TABLE || 'BetaTesters';

let baseInstance: any = null;

function getBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error(
      'Airtable no está configurado. Revisa AIRTABLE_API_KEY y AIRTABLE_BASE_ID en Vercel.'
    );
  }

  if (!baseInstance) {
    Airtable.configure({ apiKey: AIRTABLE_API_KEY });
    baseInstance = Airtable.base(AIRTABLE_BASE_ID);
  }

  return baseInstance;
}

/**
 * Registro de beta tester.
 *
 * Columnas necesarias en Airtable:
 * - Nombre
 * - Empresa
 * - Email
 * - Telefono
 * - Perfil
 * - Vehiculos
 * - HerramientasActuales
 * - Motivacion
 * - Estado
 * - FechaSolicitud
 * - Origen
 */
export interface BetaTesterRecord {
  Nombre: string;
  Empresa: string;
  Email: string;
  Telefono: string;
  Perfil: string;
  Vehiculos?: number;
  HerramientasActuales?: string;
  Motivacion: string;
  Origen?: string;
  Estado?: 'Pendiente' | 'Aceptado' | 'Rechazado' | 'Contactado' | 'Demo agendada' | 'Cerrado';
  FechaSolicitud?: string;
}

/**
 * Crea un nuevo registro de beta tester con estado "Pendiente".
 */
export async function createBetaTester(
  data: Omit<BetaTesterRecord, 'Estado' | 'FechaSolicitud'>
) {
  try {
    const base = getBase();

    const fields = {
      ...data,
      Origen: data.Origen || 'beta-tester',
      Estado: 'Pendiente',
      FechaSolicitud: new Date().toISOString().split('T')[0],
    };

    const records = await base(AIRTABLE_BETA_TABLE).create(
      [
        {
          fields,
        },
      ],
      {
        typecast: true,
      }
    );

    return records[0];
  } catch (error: any) {
    console.error('[Airtable] Error creando beta tester:', error);
    console.error('[Airtable] Mensaje:', error?.message);
    console.error('[Airtable] Status:', error?.statusCode);

    throw new Error(error?.message || 'No se pudo crear el registro en Airtable.');
  }
}

/**
 * Registro de solicitud de demo.
 *
 * Usa las mismas columnas que la tabla BetaTesters para evitar errores
 * con nombres de campos distintos en Airtable.
 */
export interface DemoRequestRecord {
  Nombre: string;
  Empresa: string;
  Email: string;
  Telefono: string;
  Perfil: string;
  Vehiculos?: number;
  HerramientasActuales?: string;
  Motivacion: string;
  Origen?: string;
  Estado?: 'Pendiente' | 'Aceptado' | 'Rechazado' | 'Contactado' | 'Demo agendada' | 'Cerrado';
  FechaSolicitud?: string;
}

/**
 * Crea una nueva solicitud de demo en Airtable.
 *
 * Por defecto guarda en la misma tabla BetaTesters,
 * pero con Origen = "solicitar-demo".
 */
export async function createDemoRequest(
  data: Omit<DemoRequestRecord, 'Estado' | 'FechaSolicitud'>
) {
  try {
    const base = getBase();

    const fields = {
      ...data,
      Origen: data.Origen || 'solicitar-demo',
      Estado: 'Pendiente',
      FechaSolicitud: new Date().toISOString().split('T')[0],
    };

    const records = await base(AIRTABLE_DEMO_TABLE).create(
      [
        {
          fields,
        },
      ],
      {
        typecast: true,
      }
    );

    return records[0];
  } catch (error: any) {
    console.error('[Airtable] Error creando solicitud de demo:', error);
    console.error('[Airtable] Mensaje:', error?.message);
    console.error('[Airtable] Status:', error?.statusCode);

    throw new Error(error?.message || 'No se pudo crear la solicitud de demo en Airtable.');
  }
}

/**
 * Cuenta cuántos beta testers están "Aceptados".
 * Si falla, devuelve null para que la web use un fallback.
 */
export async function countAcceptedBetaTesters(): Promise<number | null> {
  try {
    const base = getBase();

    const records = await base(AIRTABLE_BETA_TABLE)
      .select({
        filterByFormula: "{Estado} = 'Aceptado'",
        fields: ['Estado'],
      })
      .all();

    return records.length;
  } catch (error) {
    console.error('[Airtable] Error contando beta testers aceptados:', error);
    return null;
  }
}
```
