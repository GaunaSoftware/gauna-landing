import Airtable from 'airtable';

// Variables de entorno configuradas en Vercel y en .env local
const AIRTABLE_API_KEY = import.meta.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.AIRTABLE_BASE_ID;
const AIRTABLE_BETA_TABLE = import.meta.env.AIRTABLE_BETA_TABLE || 'BetaTesters';

let baseInstance: any = null;

function getBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable no está configurado. Revisa AIRTABLE_API_KEY y AIRTABLE_BASE_ID en Vercel.');
  }

  if (!baseInstance) {
    Airtable.configure({ apiKey: AIRTABLE_API_KEY });
    baseInstance = Airtable.base(AIRTABLE_BASE_ID);
  }

  return baseInstance;
}

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

export async function createBetaTester(data: Omit<BetaTesterRecord, 'Estado' | 'FechaSolicitud'>) {
  try {
    const base = getBase();

    const fields = {
      ...data,
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
    console.error('[Airtable] Error creando solicitud:', error);
    console.error('[Airtable] Mensaje:', error?.message);
    console.error('[Airtable] Status:', error?.statusCode);
    throw new Error(error?.message || 'No se pudo crear el registro en Airtable.');
  }
}

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
