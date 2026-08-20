import React, { useEffect, useRef, useState } from 'react';
import { cx, highlightParts } from '../lib/utils';
import type { Meta } from '../lib/types';
import { ROLE_META, type Role } from '../lib/types';
import { useStore } from '../lib/store';
import { IcX, IcCheck, IcAlert } from './icons';

/* ── scroll reveal ── */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); ob.disconnect(); } }, { threshold: 0.06 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx('reveal', inView && 'is-in', className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/* ── count-up number ── */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 650;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{n}</span>;
}

/* ── chips ── */
export function Chip({ meta, label, className }: { meta: Meta; label?: string; className?: string }) {
  return (
    <span className={cx('chip', meta.chip, className)}>
      <span className={cx('dot', meta.dot)} />
      {label ?? meta.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={cx('chip', ROLE_META[role])}>{role}</span>;
}

export function Avatar({ name, color, size = 28, className }: { name: string; color: string; size?: number; className?: string }) {
  const ini = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full font-display font-bold text-white shrink-0', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
      title={name}
    >
      {ini}
    </span>
  );
}

/* ── overlay primitives ── */
export function Modal({ open, onClose, title, subtitle, children, footer, w = 'max-w-xl' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode;
  children: React.ReactNode; footer?: React.ReactNode; w?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-pine-950/55 anim-fade" onClick={onClose} />
      <div className={cx('relative bg-card border border-line rounded-t-xl sm:rounded-xl shadow-2xl w-full anim-pop flex flex-col max-h-[92vh]', w)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line-soft">
          <div>
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm !px-1.5" aria-label="Close dialog"><IcX size={15} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line-soft flex items-center justify-end gap-2 bg-paper/60 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, w = 'max-w-md', footer }: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode;
  children: React.ReactNode; w?: string; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-pine-950/45 anim-fade" onClick={onClose} />
      <div className={cx('absolute right-0 top-0 bottom-0 w-full bg-card border-l border-line shadow-2xl anim-slide-left flex flex-col', w)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line-soft shrink-0">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm !px-1.5 shrink-0" aria-label="Close panel"><IcX size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line-soft shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', tone = 'danger' }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: React.ReactNode;
  confirmLabel?: string; tone?: 'danger' | 'primary';
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} w="max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }>
      <div className="flex gap-3 text-[13px] text-ink-soft leading-relaxed">
        <span className={cx('mt-0.5 shrink-0', tone === 'danger' ? 'text-clay-600' : 'text-pine-600')}><IcAlert size={18} /></span>
        <div>{body}</div>
      </div>
    </Modal>
  );
}

/* ── empty state ── */
export function EmptyState({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-pine-50 border border-pine-100 flex items-center justify-center text-pine-600 mb-3">{icon}</div>
      <h4 className="font-display font-bold text-[15px] text-ink">{title}</h4>
      <p className="text-[13px] text-ink-faint mt-1 max-w-sm leading-relaxed">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ── form helpers ── */
export function Field({ label, req, children, hint, error }: { label: string; req?: boolean; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div>
      <label className="label">{label}{req && <span className="text-clay-600 ml-0.5">*</span>}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-ink-faint mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-clay-600 font-medium mt-1">{error}</p>}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex bg-line-soft/70 border border-line rounded-md p-0.5 gap-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={cx('px-3 h-7.5 rounded-[5px] text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap',
            value === o.v ? 'bg-card text-pine-700 shadow-sm' : 'text-ink-faint hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cx('relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer', checked ? 'bg-pine-600' : 'bg-line', disabled && 'opacity-40 cursor-not-allowed')}
      role="switch" aria-checked={checked}
    >
      <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-line overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cx('relative px-3.5 py-2 text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors',
            active === t.id ? 'text-pine-700' : 'text-ink-faint hover:text-ink')}>
          {t.label}
          {typeof t.count === 'number' && <span className={cx('ml-1.5 text-[10.5px] font-mono px-1 py-px rounded', active === t.id ? 'bg-pine-100 text-pine-700' : 'bg-line-soft text-ink-faint')}>{t.count}</span>}
          {active === t.id && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-pine-600 rounded-full" />}
        </button>
      ))}
    </div>
  );
}

/* ── page head ── */
export function PageHead({ kicker, title, sub, children }: { kicker?: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        {kicker && <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brass-600 mb-1">{kicker}</p>}
        <h1 className="font-display font-extrabold text-[22px] sm:text-[26px] leading-tight text-ink tracking-tight">{title}</h1>
        {sub && <p className="text-[13px] text-ink-soft mt-1 max-w-2xl">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ── key/value ── */
export function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line-soft last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint shrink-0">{k}</span>
      <span className={cx('text-[12.5px] text-ink text-right min-w-0 break-words', mono && 'ref')}>{v}</span>
    </div>
  );
}

/* ── highlight ── */
export function Hi({ text, q }: { text: string; q?: string }) {
  if (!q) return <>{text}</>;
  return (
    <>
      {highlightParts(text, q).map((p, i) => (p.hit ? <mark key={i} className="bg-brass-100 text-inherit rounded-[2px] px-px">{p.text}</mark> : <React.Fragment key={i}>{p.text}</React.Fragment>))}
    </>
  );
}

/* ── toasts ── */
export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(92vw,380px)]">
      {toasts.map((t) => (
        <div key={t.id} className={cx('anim-slide-left flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-lg text-[13px] font-medium backdrop-blur',
          t.kind === 'success' && 'bg-pine-900/95 border-pine-700 text-pine-50',
          t.kind === 'error' && 'bg-clay-600/95 border-clay-500 text-clay-50',
          t.kind === 'info' && 'bg-card/95 border-line text-ink')}>
          <span className={cx('mt-0.5 shrink-0', t.kind === 'success' ? 'text-brass-400' : t.kind === 'error' ? 'text-clay-100' : 'text-pine-600')}>
            {t.kind === 'error' ? <IcAlert size={15} /> : <IcCheck size={15} />}
          </span>
          <span className="flex-1 leading-snug">{t.msg}</span>
          <button onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100 cursor-pointer shrink-0" aria-label="Dismiss">
            <IcX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── small stat tile ── */
export function Stat({ label, value, sub, tone = 'neutral', onClick }: {
  label: string; value: number; sub?: React.ReactNode;
  tone?: 'neutral' | 'pine' | 'brass' | 'clay' | 'steel';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    neutral: 'text-ink', pine: 'text-pine-600', brass: 'text-brass-600', clay: 'text-clay-600', steel: 'text-steel-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cx('card px-3.5 py-3 text-left transition-all duration-200 w-full', onClick && 'hover:border-pine-300 hover:-translate-y-px hover:shadow-md cursor-pointer')}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint leading-tight">{label}</p>
      <p className={cx('font-display font-extrabold text-[24px] leading-none mt-1.5 tabular-nums', tones[tone])}>
        <CountUp value={value} />
      </p>
      {sub && <p className="text-[11px] text-ink-faint mt-1 leading-tight">{sub}</p>}
    </button>
  );
}
