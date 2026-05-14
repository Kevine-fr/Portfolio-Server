import { useState } from 'react';
import { TEXT_OPACITY } from '../../styles/tokens';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export default function SectionContact() {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // 'idle' | 'sending' | 'sent' | 'error'
  const [status,  setStatus]  = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message.join(', ') : (data.message || `HTTP ${res.status}`)
        );
      }

      setStatus('sent');
      setName(''); setEmail(''); setSubject(''); setMessage('');
      // Re-enable form after 5s
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Une erreur est survenue. Reessayez.');
    }
  };

  const disabled = status === 'sending';

  return (
    <section
      id="contact"
      data-section="4"
      className="relative z-10 min-h-screen flex items-center px-6 md:px-12 lg:px-24 py-20"
    >
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Texte gauche */}
        <div className="md:max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8a6f3f] mb-6">
            {`> 04_contact.terminal`}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-[#f5efe0] leading-tight mb-6">
            On collabore ?
          </h2>
          <p className="text-[#d4c19a]/70 leading-relaxed mb-8" style={{ opacity: TEXT_OPACITY }}>
            Une idee, un projet, juste pour echanger. Le canal est ouvert.
          </p>
          <dl className="space-y-3 font-mono text-sm">
            <div>
              <dt className="text-[#8a6f3f] uppercase tracking-widest text-xs">Email</dt>
              <dd className="text-[#d4c19a]">contact@kevinefray.dev</dd>
            </div>
            <div>
              <dt className="text-[#8a6f3f] uppercase tracking-widest text-xs">Localisation</dt>
              <dd className="text-[#d4c19a]">Ile-de-France, FR</dd>
            </div>
          </dl>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#0a0612]/40 backdrop-blur-sm border border-[#8a6f3f]/20 rounded-md p-6 md:p-8 shadow-[0_0_24px_rgba(255,217,122,0.08)]">
            <FormField label="Nom" value={name} onChange={setName} required disabled={disabled} />
            <FormField label="Email" type="email" value={email} onChange={setEmail} required disabled={disabled} />
            <FormField label="Sujet" value={subject} onChange={setSubject} disabled={disabled} />
            <FormField label="Message" textarea value={message} onChange={setMessage} required disabled={disabled} />

            <button
              type="submit"
              disabled={disabled}
              className="mt-2 w-full px-6 py-3 bg-[#8a6f3f] text-[#050309] font-mono text-sm font-semibold uppercase tracking-widest rounded-sm hover:bg-[#ffd97a] hover:shadow-[0_0_24px_rgba(255,217,122,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'sending' && '> transmission en cours...'}
              {status === 'sent'    && '> message recu ✦'}
              {status === 'error'   && '> reessayer'}
              {(status === 'idle')  && '> envoyer le signal'}
            </button>

            {status === 'sent' && (
              <p className="mt-4 text-xs text-[#7ad48a] font-mono text-center animate-pulse">
                ● Signal capture. Reponse sous 48h.
              </p>
            )}
            {status === 'error' && errorMsg && (
              <p className="mt-4 text-xs text-[#ff6b6b] font-mono text-center">
                ⚠ {errorMsg}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function FormField({ label, value, onChange, type = 'text', required, disabled, textarea }) {
  const baseClass =
    'w-full bg-[#120a1c]/60 border border-[#8a6f3f]/30 rounded-sm px-3 py-2.5 text-[#f5efe0] font-mono text-sm placeholder-[#8a7e66] focus:outline-none focus:border-[#ffd97a]/60 focus:shadow-[0_0_8px_rgba(255,217,122,0.15)] transition-colors disabled:opacity-50';

  return (
    <div className="mb-4">
      <label className="block font-mono text-xs uppercase tracking-widest text-[#8a6f3f] mb-1.5">
        {label} {required && <span className="text-[#ff6b6b]">*</span>}
      </label>
      {textarea ? (
        <textarea
          rows={5}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      )}
    </div>
  );
}
