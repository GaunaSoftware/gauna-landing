// UI outcomes are deliberately separate from provider acceptance and inbox delivery.
export function deliveryMessage(kind, result) {
  if (kind === 'information') return result.internalNotification === 'accepted'
    ? 'Solicitud registrada para el equipo. Contactaremos contigo sobre DeCA y TransGest.'
    : 'No hemos podido confirmar el aviso al equipo. Puedes reintentar o escribir a hola@gauna.es.';
  const visitor = result.visitorEmail === 'accepted';
  const internal = result.internalNotification === 'accepted';
  if (visitor && internal) return 'El servicio de correo ha aceptado el envío de la guía. Revisa tu bandeja y spam; también puedes descargarla directamente aquí.';
  if (visitor) return 'El servicio de correo ha aceptado el envío de tu guía, pero el aviso al equipo ha fallado. Puedes descargarla ya o reintentar sin duplicar el correo.';
  if (internal) return 'Hemos recibido la solicitud, pero no se ha podido confirmar el envío a tu correo. Descarga el PDF directamente o reintenta.';
  return 'No hemos podido confirmar el envío por correo. La descarga directa sigue disponible. Puedes reintentar o escribir a hola@gauna.es.';
}

export function bindDeCAForms(win, doc) {
  doc.querySelectorAll('form[data-deca-request-form]').forEach(form => {
    if (form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';
    const startedAt = Date.now();
    let requestId = win.crypto.randomUUID();
    let busy = false;
    const button = form.querySelector('[data-deca-request-submit]');
    const wrapper = form.closest('[data-deca-request-wrapper]');
    const status = wrapper?.querySelector('[data-deca-request-status]');
    const originalLabel = button?.textContent;
    if (!button || !status) return;
    // Editing meaningful fields starts a new request; CAPTCHA renewal does not.
    form.addEventListener('input', event => {
      if (event.target?.name && !['turnstileToken', 'website'].includes(event.target.name)) requestId = win.crypto.randomUUID();
    });
    const renew = () => {
      const captcha = form.querySelector('[data-deca-captcha]');
      form.querySelectorAll('input[name="turnstileToken"]').forEach(input => { input.value = ''; });
      try { if (captcha && win.turnstile) win.turnstile.reset(captcha); } catch { /* The next submit stays blocked until a valid token exists. */ }
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      const fields = new win.FormData(form);
      const value = name => String(fields.get(name) || '').trim();
      const token = value('turnstileToken');
      if (!token) {
        status.textContent = 'Completa o renueva la verificación anti-spam antes de enviar.';
        status.classList.remove('hidden'); status.focus(); renew(); return;
      }
      const payload = { requestId, startedAt, name: value('name'), email: value('email'), company: value('company'), profile: value('profile'), phone: value('phone'), message: value('message'), website: value('website'), turnstileToken: token, consent: fields.get('consent') === 'on', contactRequested: fields.get('contactRequested') === 'on' };
      busy = true; button.disabled = true; button.textContent = 'Enviando…'; form.setAttribute('aria-busy', 'true');
      const controller = new win.AbortController();
      const timer = win.setTimeout(() => controller.abort(), 30000);
      let complete = false;
      try {
        const response = await win.fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        const result = await response.json();
        if (!result || result.validated !== true) throw new Error(typeof result?.error === 'string' ? result.error : 'No se ha podido confirmar el envío. Vuelve a intentarlo.');
        complete = response.ok && result.success === true;
        status.textContent = deliveryMessage(form.dataset.kind, result);
        if (complete) form.classList.add('hidden');
      } catch (error) {
        status.textContent = error?.name === 'AbortError'
          ? 'No hemos podido confirmar la respuesta a tiempo. Puedes reintentar; no se borrarán tus datos.'
          : error instanceof Error ? error.message : 'No se ha podido confirmar el envío.';
      } finally {
        win.clearTimeout(timer);
        status.classList.remove('hidden'); status.focus();
        if (!complete) renew();
        busy = false; button.disabled = false; button.textContent = originalLabel; form.removeAttribute('aria-busy');
      }
    });
  });
}
