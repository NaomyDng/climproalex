/* =========================
   Utils
   ========================= */
const qs  = (s, p=document) => p.querySelector(s);
const qsa = (s, p=document) => [...p.querySelectorAll(s)];

/* =========================
   Header shadow au scroll
   ========================= */
const header = qs('.header');
const onScroll = () => {
  if (!header) return;
  if (window.scrollY > 6) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

/* =========================
   Menu hamburger (toggle + a11y)
   ========================= */
const ham = qs('#hamburger');
const menu = qs('#menu');
const closeBtn = qs('#menuClose');

function openMenu(){
  if (!menu) return;
  menu.classList.add('open');
  ham?.classList.add('active');
  ham?.setAttribute('aria-expanded','true');
  document.body.style.overflow = 'hidden';
  // focus sur le 1er lien DANS le menu (scopé)
  qs('.menu__links a', menu)?.focus();
}
function closeMenu(){
  if (!menu) return;
  menu.classList.remove('open');
  ham?.classList.remove('active');
  ham?.setAttribute('aria-expanded','false');
  document.body.style.overflow = '';
  ham?.focus();
}
if (ham && menu){
  ham.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
  menu.addEventListener('click', (e) => { if (e.target === menu) closeMenu(); });
  closeBtn?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu(); });
  qsa('.menu__links a', menu).forEach(a => a.addEventListener('click', closeMenu));
}

/* =========================
   Routage intelligent vers #devis / #contact (fix Samsung)
   ========================= */
(function(){
  const path = location.pathname.replace(/\/+$/,'');
  const onHome = path === '' || /(?:^|\/)index\.html$/.test(path);

  function wireToHomeAnchor(anchorId, legacyFile){
    const links = qsa(`a[href$="${legacyFile}"], a[href="#${anchorId}"]`);
    links.forEach(a=>{
      if (onHome){
        a.setAttribute('href', `#${anchorId}`);
      } else {
        a.setAttribute('href', `index.html#${anchorId}`);
      }
    });
  }

  wireToHomeAnchor('devis', 'devis.html');
  wireToHomeAnchor('contact', 'contact.html');
})();

/* =========================
   Année footer
   ========================= */
const yearEl = qs('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================
   Reveal on scroll
   ========================= */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }
  });
},{ threshold:.12 });
qsa('.a-reveal').forEach(el=> io.observe(el));

/* =========================
   Formulaire(s) — unifié + validation email OU téléphone
   ========================= */
(function(){
  const forms = qsa('#form-devis, #quoteForm');
  if (!forms.length) return;

  const setIfEmpty = (el, txt)=>{ if (el && !el.textContent.trim()) el.textContent = txt; };

  const legend = qs('#form-title');
  const path = location.pathname;
  if (legend){
    if (/entretien/i.test(path)) setIfEmpty(legend, 'Demande d’entretien');
    else if (/depannage/i.test(path)) setIfEmpty(legend, 'Demande de dépannage');
    else if (/installation/i.test(path)) setIfEmpty(legend, 'Demande d’info');
    else setIfEmpty(legend, 'Demande de devis gratuit');
  }

  forms.forEach(form=>{
    const src = form.querySelector('#page_source');
    if (src) src.value = `${document.title} — ${location.href}`;

    const success = form.querySelector('#formSuccess') || qs('#formSuccess');
    const email   = form.querySelector('#email');
    const phone   = form.querySelector('#phone');
    const hp      = form.querySelector('#hp'); // honeypot

    const hasVal = el => !!(el && el.value && el.value.trim() !== '');
    const validateContact = () => {
      const ok = hasVal(email) || hasVal(phone);
      if (!ok && email){
        email.setCustomValidity('Indiquez au moins un email ou un téléphone.');
        email.reportValidity();
      } else if (email){
        email.setCustomValidity('');
      }
      return ok;
    };
    email?.addEventListener('input', ()=> email.setCustomValidity(''));
    phone?.addEventListener('input', ()=> email?.setCustomValidity(''));

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();

      // 1) HTML5 validity
      if (!form.checkValidity()) { 
        form.reportValidity(); 
        return; // <— empêcher l’envoi si invalide
      }

      // 2) Contact: email OU téléphone
      if (!validateContact()) return;

      // 3) Honeypot anti-bot
      if (hp && hp.value) return;

      const fd = new FormData(form);
      const endpoint = form.getAttribute('action') || '';
      const method   = (form.getAttribute('method') || 'POST').toUpperCase();

      try{
        let sent = false;
        if (endpoint.startsWith('https://formspree.io') && method === 'POST'){
          const res = await fetch(endpoint, { method:'POST', body:fd, headers:{ 'Accept':'application/json' }});
          sent = res.ok;
        }
        form.reset();
        if (success){ success.hidden = false; success.scrollIntoView({behavior:'smooth', block:'center'}); }
        if (!sent && endpoint) console.warn('Form submit non confirmé (vérifie l’endpoint).');
      }catch(err){
        console.error(err);
        alert('Désolé, une erreur réseau est survenue. Réessayez.');
      }
    });
  });
})();

/* =========================
   Devis modal — ouverture globale pour .open-devis
   ========================= */
(function(){
  const modal = document.getElementById('devisModal');
  if (!modal) return;

  const closer = modal.querySelector('[data-close-modal]');

  const openModal = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
    const first = modal.querySelector('#fullname');
    if (first) setTimeout(()=> first.focus(), 50);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';
  };

  // Délégation: toute .open-devis ouvre le modal
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.open-devis');
    if (btn) { e.preventDefault(); openModal(); }
  });

  closer?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
})();
