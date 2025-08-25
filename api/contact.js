// api/contact.js
import { Resend } from 'resend';

// --- CONFIG ---
// Définis l’email expéditeur : idéalement une adresse du domaine.
const FROM_EMAIL = 'Climpro <info@climpro.be>';
// Destinataire(s) interne(s) : où tu veux recevoir les demandes
const TO_EMAILS = ['info@climpro.be'];

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple util : valid email
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
// Simple util : sanitization de base (empêche HTML)
const sanitize = v => (v || '').toString().replace(/[<>]/g, '').trim();

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
    }

    // 1) Parse & sanitize
    const {
      fullname,
      email,
      phone,
      postal,
      service,
      appareils,
      message,
      page_source,
      hp,           // honeypot anti-bot (doit rester vide)
      consent
    } = req.body || {};

    // 2) Anti-spam basique (honeypot + délais côté JS, et champ consent requis)
    if (hp) return res.status(200).json({ ok: true }); // on fait comme si c'était ok, mais on ignore
    if (!consent) return res.status(400).json({ ok: false, error: 'Consentement requis' });

    // 3) Validation : champs essentiels
    const _full = sanitize(fullname);
    const _msg  = sanitize(message);
    const _email = sanitize(email);
    const _phone = sanitize(phone);
    const _postal = sanitize(postal);
    const _service = sanitize(service);
    const _apps = sanitize(appareils);
    const _page = sanitize(page_source);

    if (!_full || !_msg || !_postal || !_service) {
      return res.status(400).json({ ok: false, error: 'Champs requis manquants' });
    }
    // Email OU téléphone obligatoire
    if (!(_phone && _phone.length >= 6) && !(isEmail(_email))) {
      return res.status(400).json({ ok: false, error: 'Email valide OU téléphone requis' });
    }

    // 4) Construire le sujet en fonction de la page/service
    const subjectPrefix =
      _service.toLowerCase().includes('entretien') ? 'Demande d’entretien' :
      _service.toLowerCase().includes('dépannage') ? 'Demande de dépannage' :
      _service.toLowerCase().includes('installation') ? 'Demande d’info installation' :
      'Demande de devis gratuit';
    const subject = `${subjectPrefix} — ${_full}`;

    // 5) Corps HTML (sobre, pérenne)
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial">
        <h2 style="margin:0 0 12px">Nouvelle demande via Climpro.be</h2>
        <p><strong>Nom :</strong> ${_full}</p>
        <p><strong>Email :</strong> ${_email || '—'}</p>
        <p><strong>Téléphone :</strong> ${_phone || '—'}</p>
        <p><strong>Code postal :</strong> ${_postal}</p>
        <p><strong>Service :</strong> ${_service}</p>
        <p><strong>Nombre d’appareils :</strong> ${_apps || '—'}</p>
        <p><strong>Message :</strong><br>${_msg.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color:#64748b">Source : ${_page || '/'}</p>
      </div>
    `;

    // 6) Envoi email interne
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAILS,
      subject,
      html,
      reply_to: _email || undefined
    });

    // 7) Accusé de réception au client (si email fourni)
    if (isEmail(_email)) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: _email,
        subject: `✅ ${subjectPrefix} — Climpro`,
        html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial">
            <p>Bonjour ${_full.split(' ')[0] || ''},</p>
            <p>Nous avons bien reçu votre demande. Notre équipe vous répondra sous 24h ouvrées.</p>
            <p style="margin:12px 0 0"><strong>Récapitulatif :</strong></p>
            <ul>
              <li>Service : ${_service}</li>
              <li>Code postal : ${_postal}</li>
              <li>Nombre d’appareils : ${_apps || '—'}</li>
            </ul>
            <p>Si urgent, vous pouvez aussi nous appeler au <a href="tel:024284035">02 428 40 35</a>.</p>
            <hr>
            <p style="color:#64748b">Climpro — 133 Rue des Colombophiles, 1070 Bruxelles — TVA BE0564.697.277</p>
          </div>
        `
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[API contact] Error', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}
