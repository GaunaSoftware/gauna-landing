import {productMedia, productScreens} from '../config/product-media.mjs';

export function installProductGallery(doc, win) {
  const root = doc.querySelector('.storefront');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const viewer = $('#viewer');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocus, timer = null;
  function showScreen(id) {
    const screen = productMedia.find(item => item.id === id);
    if (!screen || !viewer) return;
    lastFocus = doc.activeElement;
    $('#viewer-title').textContent = screen.title;
    $('#viewer-caption').textContent = `${screen.caption} Identidades y cifras de demostración.`;
    const image = doc.createElement('img');
    image.src = screen.src;
    image.alt = `${screen.title}, datos de demostración`;
    image.width = screen.width;
    image.height = screen.height;
    $('#viewer-body').replaceChildren(image);
    viewer.showModal();
    doc.body.style.overflow = 'hidden';
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-screen]');
    if (button) showScreen(button.dataset.screen);
  });
  viewer?.querySelector('[data-close]')?.addEventListener('click', () => viewer.close());
  viewer?.addEventListener('close', () => {doc.body.style.overflow = ''; lastFocus?.focus();});
  viewer?.addEventListener('click', event => {
    const rect = viewer.getBoundingClientRect();
    if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) viewer.close();
  });
  function selectHero(id) {
    const screen = productScreens.find(item => item.id === id);
    if (!screen || !$('#hero-image')) return;
    const image = $('#hero-image');
    image.src = screen.src; image.alt = `${screen.title}, datos de demostración`;
    image.width = screen.width; image.height = screen.height;
    $('#hero-screen-title').textContent = screen.title;
    $('#hero-image-button').dataset.screen = id;
    $('#hero-image-button').setAttribute('aria-label', `Ampliar ${screen.title}`);
    $$('[data-hero]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hero === id)));
  }
  function stopTour() {
    win.clearInterval(timer); timer = null;
    const button = $('#tour-toggle');
    if (button) {button.textContent = '▷ Recorrido visual'; button.setAttribute('aria-pressed', 'false');}
  }
  $$('[data-hero]').forEach(button => button.addEventListener('click', () => {stopTour(); selectHero(button.dataset.hero);}));
  $('#tour-toggle')?.addEventListener('click', () => {
    if (timer) {stopTour(); return;}
    let index = Math.max(0, productScreens.findIndex(item => item.id === $('#hero-image-button').dataset.screen));
    const advance = () => {index = (index + 1) % productScreens.length; selectHero(productScreens[index].id);};
    if (reduced.matches || win.navigator.connection?.saveData) {advance(); return;}
    $('#tour-toggle').textContent = 'Ⅱ Pausar recorrido'; $('#tour-toggle').setAttribute('aria-pressed', 'true');
    timer = win.setInterval(() => {if (!doc.hidden && !viewer.open) advance();}, 4800);
  });
  doc.addEventListener('visibilitychange', () => {if (doc.hidden) stopTour();});
  reduced.addEventListener('change', stopTour);
  const steps = [
    ['pedidos', 'Pedidos y tráfico', 'El servicio empieza con toda la información en su sitio.'],
    ['mesa-nueva', 'Planificación', 'Ve la semana. Organiza lo que viene.'],
    ['dashboard', 'Control operativo', 'Lo importante no debería perderse entre pantallas.'],
    ['finanzas', 'Administración', 'La operación continúa en administración.']
  ];
  function selectStep(index, focus = false) {
    if (!steps[index]) return;
    const [id, label, title] = steps[index], screen = productMedia.find(item => item.id === id);
    $$('[data-step]').forEach((button, i) => {
      button.setAttribute('aria-selected', String(index === i)); button.tabIndex = index === i ? 0 : -1;
      button.querySelector('.step-plus').textContent = index === i ? '−' : '+';
    });
    $('#workflow-panel').setAttribute('aria-labelledby', `step-${index}`);
    $('#flow-label').textContent = label; $('#flow-title').textContent = title;
    const image = $('#flow-image-button img');
    image.src = screen.src; image.alt = `${screen.title}, datos de demostración`;
    image.width = screen.width; image.height = screen.height;
    $('#flow-image-button').dataset.screen = id; $('#flow-expand').dataset.screen = id;
    if (focus) $(`#step-${index}`).focus();
  }
  $$('[data-step]').forEach(button => {
    button.addEventListener('click', () => selectStep(Number(button.dataset.step)));
    button.addEventListener('keydown', event => {
      const index = Number(button.dataset.step);
      const next = {ArrowDown:(index+1)%4, ArrowRight:(index+1)%4, ArrowUp:(index+3)%4, ArrowLeft:(index+3)%4, Home:0, End:3}[event.key];
      if (next === undefined) return;
      event.preventDefault(); selectStep(next, true);
    });
  });
}
