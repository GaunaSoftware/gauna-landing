// TransGest tariff PDF supplied on 15 October 2026; Planner tariff supplied on 6 October.
// Integer EUR cents, excluding VAT. Annual discount applies to the subscription only.
import {stripeCatalog} from './stripe-catalog.mjs';
export const commercePlans = [
 {id:'go',name:'Go',monthly:25900,annual:264180,integration:0},
 {id:'pro',name:'Pro',monthly:53900,annual:549780,integration:0},
 {id:'intelligence',name:'Pro Intelligence',monthly:95900,annual:978180,integration:0},
 {id:'planner',name:'Planner',monthly:65900,annual:672180,integration:0},
];
// Formato español con punto de miles también en cuatro cifras (2.641,80 €): Intl no lo pone por debajo de 10.000.
export const money = cents => {const [int,dec]=(Math.abs(cents)/100).toFixed(2).split('.');return `${cents<0?'-':''}${int.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${dec}\u00a0€`;};
export const commercePlan = id => commercePlans.find(plan=>plan.id===id);
export const priceVariable = (id,cycle) => `STRIPE_PRICE_${id.toUpperCase()}_${cycle.toUpperCase()}`;
export const stripePrice = (env,id,cycle) => env[priceVariable(id,cycle)] || stripeCatalog.prices[id]?.[cycle];
// Preview for Spain's general VAT regime; Stripe calculates the final tax from billing details.
export const vatBreakdown = net => {const vat=Math.round(net*21/100);return {net,vat,total:net+vat};};
export function paymentReady(env,plan){
 const mode=env.STRIPE_SECRET_KEY?.match(/^(?:sk|rk)_(live|test)_/)?.[1];
 return env.STRIPE_PAYMENTS_ENABLED==='true' && Boolean(mode) && env.PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(`pk_${mode}_`) && /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||'') && Boolean(env.RESEND_API_KEY) && ['monthly','annual'].every(cycle=>/^price_/.test(stripePrice(env,plan.id,cycle)||''));
}
