// Approved September 2026 tariff PDF and Planner tariff supplied on 6 October.
// Integer EUR cents, excluding VAT. Annual discount applies to the subscription only.
import {stripeCatalog} from './stripe-catalog.mjs';
export const commercePlans = [
 {id:'go',name:'Go',monthly:16900,annual:172380,integration:150000},
 {id:'pro',name:'Pro',monthly:34900,annual:355980,integration:150000},
 {id:'intelligence',name:'Pro Intelligence',monthly:47900,annual:488580,integration:0},
 {id:'planner',name:'Planner',monthly:65900,annual:672180,integration:150000},
];
export const money = cents => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(cents/100);
export const commercePlan = id => commercePlans.find(plan=>plan.id===id);
export const priceVariable = (id,cycle) => `STRIPE_PRICE_${id.toUpperCase()}_${cycle.toUpperCase()}`;
export const stripePrice = (env,id,cycle) => env[priceVariable(id,cycle)] || stripeCatalog.prices[id]?.[cycle];
export const integrationPrice = env => env.STRIPE_PRICE_INTEGRATION || stripeCatalog.integration;
export function paymentReady(env,plan){
 const mode=env.STRIPE_SECRET_KEY?.match(/^(?:sk|rk)_(live|test)_/)?.[1];
 return env.STRIPE_PAYMENTS_ENABLED==='true' && Boolean(mode) && env.PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(`pk_${mode}_`) && /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||'') && Boolean(env.RESEND_API_KEY) && ['monthly','annual'].every(cycle=>/^price_/.test(stripePrice(env,plan.id,cycle)||'')) && (!plan.integration || /^price_/.test(integrationPrice(env)||''));
}
