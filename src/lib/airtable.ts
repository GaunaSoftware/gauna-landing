import Airtable from 'airtable';

// Variables de entorno (configuradas en Vercel y en .env local)
const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
const AIRTABLE_BETA_TABLE = import.meta.env.AIRTABLE_BETA_TABLE || 'BetaTesters';

let baseInstance: any = null;

function getBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable no está configurado. Revisa las variables de entorno.');
  }

  if (!baseInstance) {
    Airtable.configure({ apiKey: AIRTABLE_API_KEY });
    baseInstance = Airtable.base(AIRTABLE_BASE_ID);
  }

  return baseInstance;
}

/**
 * Estructura de un registro de beta tester en Airtable
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
  Estado?: 'Pendiente' | 'Aceptado' | 'Rechazado';
  FechaSolicitud?: string;
}

/**
 * Crea un nuevo registro de beta tester con estado "Pendiente"
 */
export async function createBetaTester(data: Omit<BetaTesterRecord, 'Estado' | 'FechaSolicitud'>) {
  const base = getBase();

  const records = await base(AIRTABLE_BETA_TABLE).create([
    {
      fields: {
        ...data,
        Estado: 'Pendiente',
        FechaSolicitud: new Date().toISOString().split('T')[0],
      },
    },
  ]);

  return records[0];
}

/**
 * Cuenta cuántos beta testers están "Aceptados".
 * Si falla (API caída, credenciales mal), devuelve null para que la web use un fallback.
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
