// Approved tariff: Tarifa profesional TransGest, septiembre 2026, supplied 02/10.
// Monetary values are integer euro cents. Never apply annual discount to services/add-ons.
export const plans = [
 {id:'go', name:'Go', line:'Una base profesional. Un comienzo sencillo.', monthly:16900, annual:172380, integration:150000, tag:'Para empezar', features:['Pedidos, clientes y viajes','Documentación de transporte','Facturación y operativa esencial'], audience:'Autónomos y pequeñas estructuras.'},
 {id:'pro', name:'Pro', line:'Toda la empresa. Bajo tu control.', monthly:34900, annual:355980, integration:150000, tag:'Gestión integral', features:['Tráfico, flota y conductores','Documentación y facturación','KPIs e informes de gestión'], audience:'Empresas que necesitan una visión integral.'},
 {id:'intelligence', name:'Pro Intelligence', line:'El control de Pro. La capacidad de la IA.', monthly:47900, annual:488580, integration:0, tag:'Más automatización', features:['Todo el alcance de Pro','Automatización e IA operativa','1.000 consultas de IA al mes','Integración estándar incluida'], audience:'Equipos que quieren automatizar su operativa.'}
];
export const money = cents => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',useGrouping:'always',minimumFractionDigits:cents%100 ? 2 : 0,maximumFractionDigits:2}).format(cents/100);
export function quote(id='go',billing='monthly',ai=0,storage=0) {
 const plan=plans.find(p=>p.id===id)||plans[0];
 const cycle=billing==='annual'?'annual':'monthly';
 const count=n=>Number.isInteger(Number(n))?Math.max(0,Math.min(10,Number(n))):0;
 const aiBlocks=plan.id==='intelligence'?count(ai):0;
 const storageBlocks=count(storage);
 const extrasMonthly=aiBlocks*4900+storageBlocks*3900;
 const subscription=plan[cycle];
 return {plan,cycle,subscription,integration:plan.integration,aiBlocks,storageBlocks,extrasMonthly,initial:subscription+plan.integration+extrasMonthly,renewal:subscription,saving:plan.monthly*12-plan.annual};
}
export const screens = [
 {id:'dashboard',title:'Dashboard',caption:'Una visión compartida de la actividad.',kind:'Captura del producto · datos demo'},
 {id:'pedidos',title:'Pedidos y tráfico',caption:'Servicios, recursos y estados en su contexto.',kind:'Captura del producto · datos demo'},
 {id:'mesa-nueva',title:'Nueva mesa de tráfico',caption:'La planificación semanal, de un vistazo.',kind:'Nueva vista facilitada para esta preview'},
 {id:'finanzas',title:'Gestión financiera',caption:'Facturación, cobros y pagos conectados.',kind:'Captura del producto · datos demo'},
 {id:'informes',title:'Informes y KPIs',caption:'Del dato operativo a la lectura del negocio.',kind:'Captura del producto · valores ilustrativos'}
];
// Only approved, anonymized files may be enabled here. No third-party embeds or trackers.
// Leave videoSrc empty until an actual recording has been supplied, redacted and reviewed.
export const media = Object.fromEntries(screens.map(s=>[s.id,{poster:`/assets/${s.id}.webp`,videoSrc:'',captionsSrc:''}]));
