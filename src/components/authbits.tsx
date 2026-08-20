import React, { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/utils';
import { COUNTRIES, checkPassword, type Country, type PasswordCheck } from '../lib/security';
import { IcCheck, IcChevD, IcSearch, IcAlert } from './icons';

/* ── spinner ─────────────────────────────────────────────────────────── */
export function Spinner({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cx('animate-spin', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── six-slot OTP input ──────────────────────────────────────────────── */
export function OtpInput({ onComplete, error, disabled }: { onComplete: (code: string) => void; error?: boolean; disabled?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every((dg) => dg !== '')) onComplete(next.join(''));
  };

  const onChange = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    if (clean.length >= 6) {                       /* full paste */
      commit(clean.slice(0, 6).split(''));
      refs.current[5]?.focus();
      return;
    }
    next[i] = clean.slice(-1);
    commit(next);
    refs.current[Math.min(5, i + 1)]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) { next[i] = ''; setDigits(next); }
      else if (i > 0) { next[i - 1] = ''; setDigits(next); refs.current[i - 1]?.focus(); }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!txt) return;
    const next = Array(6).fill('').map((_: string, i: number) => txt[i] ?? '');
    commit(next);
    refs.current[Math.min(5, txt.length - 1)]?.focus();
  };

  return (
    <div className={cx('flex gap-2 justify-between', error && 'animate-[shake_0.3s_ease]')} onPaste={onPaste}>
      {digits.map((dg, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={dg}
          disabled={disabled}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6}
          aria-label={`Verification digit ${i + 1}`}
          className={cx(
            'w-full aspect-[5/6] max-w-[52px] text-center font-mono text-[22px] font-semibold rounded-md border bg-white/80 outline-none transition-all',
            error ? 'border-clay-500 text-clay-700' : dg ? 'border-pine-500 text-pine-800 bg-pine-50' : 'border-line text-ink',
            'focus:border-pine-600 focus:ring-2 focus:ring-pine-100',
            disabled && 'opacity-50',
          )}
        />
      ))}
    </div>
  );
}

/* ── universal country selector ──────────────────────────────────────── */
export function CountrySelect({ value, onChange, label = 'Country' }: { value: string; onChange: (iso2: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.iso2 === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const list = COUNTRIES.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || c.iso2.toLowerCase() === s || c.iso3.toLowerCase() === s || c.dial.includes(s);
  });

  const pick = (c: Country) => { onChange(c.iso2); setOpen(false); setQ(''); };

  return (
    <div ref={boxRef} className="relative">
      <label className="label">{label}<span className="text-clay-600 ml-0.5">*</span></label>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        className="input flex items-center gap-2.5 text-left cursor-pointer">
        <span className="text-[17px] leading-none">{selected?.flag ?? '🌐'}</span>
        <span className={cx('flex-1 truncate', !selected && 'text-ink-faint')}>{selected ? selected.name : 'Select a country'}</span>
        {selected && <span className="ref text-ink-faint">{selected.dial}</span>}
        <IcChevD size={13} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 left-0 right-0 card shadow-xl anim-pop overflow-hidden">
          <div className="p-2 border-b border-line-soft">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={13} /></span>
              <input autoFocus className="input !h-8 !pl-8 !text-[12.5px]" placeholder="Search country, code or dial…"
                value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
                  if (e.key === 'Enter' && list[hi]) { e.preventDefault(); pick(list[hi]); }
                  if (e.key === 'Escape') setOpen(false);
                }} />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto" role="listbox">
            {list.length === 0 && <p className="px-3 py-4 text-[12px] text-ink-faint text-center">No country matches “{q}”.</p>}
            {list.map((c, i) => (
              <button key={c.iso2} type="button" role="option" aria-selected={c.iso2 === value}
                onMouseEnter={() => setHi(i)} onClick={() => pick(c)}
                className={cx('w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left cursor-pointer',
                  i === hi ? 'bg-pine-50 text-pine-800' : 'text-ink')}>
                <span className="text-[15px]">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="ref text-ink-faint">{c.dial}</span>
                {c.iso2 === value && <span className="text-pine-600"><IcCheck size={13} /></span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── password strength meter ─────────────────────────────────────────── */
export function PasswordMeter({ pwd, showHint }: { pwd: string; showHint?: boolean }) {
  const chk: PasswordCheck = pwd ? checkPassword(pwd) : { ok: false, score: 0, label: '' };
  const tones = ['', 'bg-clay-500', 'bg-brass-500', 'bg-pine-500', 'bg-moss-600'];
  const texts = ['', 'text-clay-600', 'text-brass-600', 'text-pine-600', 'text-moss-700'];
  if (!pwd) return showHint ? <p className="text-[11px] text-ink-faint mt-1">At least 8 characters. Longer is stronger.</p> : null;
  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <span key={seg} className={cx('h-1 flex-1 rounded-full transition-all duration-300', seg <= chk.score ? tones[chk.score] : 'bg-line-soft')} />
        ))}
      </div>
      <p className={cx('text-[11px] font-semibold mt-1', texts[chk.score] || 'text-ink-faint')}>
        {chk.label}{!chk.ok && pwd ? ` — ${chk.reason}` : ''}
      </p>
    </div>
  );
}

/* ── password field with reveal toggle ───────────────────────────────── */
export function PasswordField({ value, onChange, placeholder, autoComplete, id }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="input !pr-16" value={value} placeholder={placeholder}
        autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint hover:text-pine-700 cursor-pointer">
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

/* ── inline alert ────────────────────────────────────────────────────── */
export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info' | 'success'; children: React.ReactNode }) {
  return (
    <div role="alert" className={cx('flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px] leading-snug anim-pop',
      kind === 'error' && 'bg-clay-50 border-clay-100 text-clay-700',
      kind === 'info' && 'bg-steel-50 border-steel-100 text-steel-700',
      kind === 'success' && 'bg-moss-50 border-moss-100 text-moss-700')}>
      <span className="mt-px shrink-0">{kind === 'error' ? <IcAlert size={14} /> : <IcCheck size={14} />}</span>
      <span>{children}</span>
    </div>
  );
}
