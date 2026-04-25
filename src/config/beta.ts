import { countAcceptedBetaTesters } from '@/lib/airtable';

export const betaConfig = {
  /** Plazas totales del programa beta */
  totalSpots: 20,

  /** Duración de la licencia gratuita para beta testers, en años */
  freeYears: 2,

  /** Fallback si Airtable falla (se usa solo si la API no responde) */
  fallbackSpotsTaken: 0,
};

export interface BetaStatus {
  totalSpots: number;
  spotsTaken: number;
  spotsRemaining: number;
  spotsFilledPercent: number;
  isBetaOpen: boolean;
  source: 'airtable' | 'fallback';
}

/**
 * Obtiene el estado actual del programa beta desde Airtable.
 * Se llama en cada request de las páginas dinámicas.
 */
export async function getBetaStatus(): Promise<BetaStatus> {
  const countFromAirtable = await countAcceptedBetaTesters();

  const spotsTaken = countFromAirtable !== null
    ? countFromAirtable
    : betaConfig.fallbackSpotsTaken;

  const spotsRemaining = Math.max(0, betaConfig.totalSpots - spotsTaken);
  const spotsFilledPercent = Math.min(100, (spotsTaken / betaConfig.totalSpots) * 100);

  return {
    totalSpots: betaConfig.totalSpots,
    spotsTaken,
    spotsRemaining,
    spotsFilledPercent,
    isBetaOpen: spotsRemaining > 0,
    source: countFromAirtable !== null ? 'airtable' : 'fallback',
  };
}
