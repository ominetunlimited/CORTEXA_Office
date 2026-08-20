import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { CortexaSeal, IcChevL, IcChevR, IcShield, IcLock, IcRegistry, IcUsers, IcSpark, IcCheck } from '../components/icons';
import { Field, RoleBadge, ToastHost } from '../components/ui';
import { cx } from '../lib/utils';
import type { OrgType } from '../lib/types';
import { ORG_TYPES } from '../lib/types';

export function Login() {
  const { db, login, loginAs } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [wizard, setWizard] = useState(false);

  const demoAccounts = useMemo(
    () => db.users.filter((u) => u.orgId === 'org_demo' && ['u_1', 'u_2', 'u_3', 'u_4'].includes(u.id)),
    [db.users],
  );

  if (wizard) return <Onboarding onBack={() => setWizard(false)} />;

  const submit = () => {
    const r = login(email, password);
    if (!r.ok) setError(r.error ?? 'Unable to sign in.');
  };

  return (
    <div className="min-h-screen flex ledger-bg">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col w-[46%] xl:w-[42%] bg-pine-900 sidebar-texture text-pine-100 p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 text-pine-800 opacity-60"><span className="block seal-spin"><CortexaSeal size={420} /></span></div>
        <div className="flex items-center gap-3 relative">
          <span className="text-brass-400"><CortexaSeal size={44} /></span>
          <div>
            <p className="font-display font-extrabold text-[22px] tracking-tight text-paper leading-none">CORTEXA</p>
            <p className="text-[11px] text-pine-300 mt-1 tracking-[0.14em] uppercase">Institutional Registry</p>
          </div>
        </div>
        <div className="mt-auto relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass-400">The institutional memory doctrine</p>
          <h1 className="font-display font-extrabold text-[30px] xl:text-[36px] leading-[1.12] text-paper mt-3 tracking-tight max-w-md">
            Every document has a history.<br />Every task has a deadline.<br />Every action leaves a record.
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2.5 max-w-md">
            {[
              ['Correspondence registry', 'Incoming · outgoing · threaded'],
              ['Matters & case files', 'The complete story of an issue'],
              ['Executive workflow', 'Approvals · delegation · decisions'],
              ['Meetings & invitations', 'Calendar · minutes · action points'],
              ['Records vault', 'Versions · OCR text · retention'],
              ['Audit trail', 'Who did what, and when'],
            ].map(([t, s]) => (
              <div key={t} className="flex gap-2.5 items-start">
                <span className="text-brass-400 mt-1"><IcCheck size={12} /></span>
                <div>
                  <p className="text-[13px] font-semibold text-paper">{t}</p>
                  <p className="text-[11px] text-pine-300">{s}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-pine-300/70 mt-10">Multi-tenant · role-based access · confidentiality levels enforced per record</p>
        </div>
      </div>

      {/* auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md anim-rise">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="text-pine-700"><CortexaSeal size={38} /></span>
            <div>
              <p className="font-display font-extrabold text-[18px] text-ink leading-none">CORTEXA</p>
              <p className="text-[10px] text-ink-faint uppercase tracking-[0.14em] mt-0.5">Institutional Registry</p>
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600">Workspace sign in</p>
          <h2 className="font-display font-extrabold text-[24px] text-ink tracking-tight mt-1">Open the registry</h2>
          <p className="text-[13px] text-ink-soft mt-1.5">Sign in to your organisation's workspace. Demo tenant: <span className="font-semibold text-ink">Cortexa Demo Foundation</span>.</p>

          <div className="card mt-5 p-4">
            <p className="label !mb-2">One-click demo accounts · password <span className="ref normal-case tracking-normal text-pine-700 bg-pine-50 px-1.5 py-0.5 rounded">cortexa</span></p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((u) => (
                <button key={u.id} onClick={() => loginAs(u.id)}
                  className="text-left border border-line rounded-md px-3 py-2.5 hover:border-pine-400 hover:bg-pine-50 transition-all cursor-pointer group">
                  <p className="text-[13px] font-semibold text-ink group-hover:text-pine-700">{u.name}</p>
                  <div className="mt-1"><RoleBadge role={u.role} /></div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 my-4">
              <span className="h-px flex-1 bg-line" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">or sign in by email</span><span className="h-px flex-1 bg-line" />
            </div>
            <div className="space-y-3">
              <Field label="Official email" req>
                <input className="input" placeholder="admin@cortexa.demo" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()} />
              </Field>
              <Field label="Password" req hint="All demo accounts use the password “cortexa”.">
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()} />
              </Field>
              {error && <p className="text-[12px] font-medium text-clay-600 bg-clay-50 border border-clay-100 rounded px-2.5 py-1.5">{error}</p>}
              <button className="btn-primary w-full !h-10" onClick={submit}><IcLock size={14} /> Sign in securely</button>
            </div>
          </div>
          <button className="w-full mt-3 card px-4 py-3 flex items-center gap-3 hover:border-brass-400 hover:bg-brass-50 transition-all cursor-pointer group" onClick={() => setWizard(true)}>
            <span className="text-brass-600"><IcRegistry size={20} /></span>
            <span className="text-left flex-1">
              <span className="block text-[13.5px] font-semibold text-ink group-hover:text-brass-700">Set up a new organisation</span>
              <span className="block text-[11.5px] text-ink-faint">10-step onboarding · your own isolated workspace</span>
            </span>
            <IcChevR size={16} className="text-ink-faint group-hover:text-brass-600" />
          </button>
          <div className="flex items-center gap-4 mt-5 text-[10.5px] text-ink-faint">
            <span className="flex items-center gap-1"><IcShield size={12} /> RBAC + tenant isolation</span>
            <span className="flex items-center gap-1"><IcSpark size={12} /> Registry assistant included</span>
            <span className="flex items-center gap-1"><IcUsers size={12} /> Up to 20 seats</span>
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

/* ── 10-step onboarding ──────────────────────────────────────────────── */
const STEPS = ['Organisation', 'Type', 'Logo', 'Address', 'Email', 'Telephone', 'Administrator', 'Departments', 'Invite users', 'Reference format'];

function Onboarding({ onBack }: { onBack: () => void }) {
  const { onboard } = useStore();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    name: '', type: 'NGO' as OrgType, initials: '', address: '', email: '', phone: '',
    adminName: '', adminEmail: '', adminTitle: '', adminPwd: '',
    refPrefix: 'ORG', emails: '',
  });
  const [deps, setDeps] = useState<{ name: string; code: string }[]>([{ name: 'Administration', code: 'ADM' }]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (k === 'name' && !f.initials) setF((p) => ({ ...p, name: e.target.value, initials: e.target.value.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() }));
    if (k === 'refPrefix') setF((p) => ({ ...p, refPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) }));
  };

  const canNext = () => {
    if (step === 0) return f.name.trim().length >= 2;
    if (step === 6) return f.adminName.trim() && /\S+@\S+\.\S+/.test(f.adminEmail) && f.adminPwd.length >= 6;
    if (step === 7) return deps.length > 0 && deps.every((d) => d.name.trim() && d.code.trim());
    if (step === 9) return f.refPrefix.length >= 2;
    return true;
  };
  const next = () => { setErr(''); if (!canNext()) { setErr('Complete this step to continue.'); return; } if (step < 9) setStep(step + 1); };

  const finish = () => {
    const r = onboard({
      name: f.name.trim(), type: f.type, logoInitials: f.initials || f.name.slice(0, 2).toUpperCase(),
      address: f.address.trim(), email: f.email.trim(), phone: f.phone.trim(),
      adminName: f.adminName.trim(), adminEmail: f.adminEmail.trim(), adminTitle: f.adminTitle.trim(), adminPwd: f.adminPwd,
      departments: deps.map((d) => ({ name: d.name.trim(), code: d.code.trim().toUpperCase().slice(0, 4) })),
      inviteEmails: f.emails.split(/[\n,]/).map((s) => s.trim()).filter((s) => /\S+@\S+\.\S+/.test(s)),
      refPrefix: f.refPrefix,
    });
    if (!r.ok) setErr(r.error ?? 'Unable to create the organisation.');
  };

  const previewRef = `${f.refPrefix || 'ORG'}/${(deps[0]?.code || 'ADM').toUpperCase()}/${new Date().getFullYear()}/0001`;

  return (
    <div className="min-h-screen ledger-bg flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl anim-rise">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-pine-700"><CortexaSeal size={34} /></span>
          <div>
            <p className="font-display font-extrabold text-[17px] text-ink leading-none">Establish your organisation</p>
            <p className="text-[11.5px] text-ink-faint mt-0.5">An isolated workspace with its own registry, users and reference format</p>
          </div>
          <button className="btn-ghost ml-auto" onClick={onBack}><IcChevL size={14} /> Back to sign in</button>
        </div>

        {/* step rail */}
        <div className="flex gap-1 mb-4">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i < step && setStep(i)} title={s}
              className={cx('h-1.5 flex-1 rounded-full transition-all duration-300 cursor-pointer', i < step ? 'bg-pine-500' : i === step ? 'bg-brass-500' : 'bg-line')} />
          ))}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-600 mb-2">Step {step + 1} of 10 · {STEPS[step]}</p>

        <div className="card p-5 sm:p-6 min-h-[280px]">
          {step === 0 && (
            <Field label="Organisation name" req hint="This names your workspace and appears on outgoing correspondence.">
              <input className="input !h-11 !text-[15px]" value={f.name} onChange={set('name')} placeholder="e.g. Greenfield University" autoFocus />
            </Field>
          )}
          {step === 1 && (
            <div>
              <p className="label">Organisation type</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ORG_TYPES.map((t) => (
                  <button key={t} onClick={() => setF({ ...f, type: t })}
                    className={cx('px-3 py-2.5 rounded-md border text-[13px] font-medium transition-all cursor-pointer',
                      f.type === t ? 'border-pine-600 bg-pine-50 text-pine-700 shadow-sm' : 'border-line bg-card text-ink-soft hover:border-pine-300')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <span className="w-20 h-20 rounded-xl bg-pine-900 text-brass-400 flex items-center justify-center font-display font-extrabold text-[26px] tracking-tight shadow-lg">
                {f.initials || (f.name ? f.name.slice(0, 2).toUpperCase() : 'OR')}
              </span>
              <div className="flex-1 w-full">
                <Field label="Logo initials" hint="Upload of full artwork is available in production deployments; initials are used for the demo seal.">
                  <input className="input !w-28 text-center font-display font-bold uppercase" maxLength={2} value={f.initials} onChange={set('initials')} />
                </Field>
              </div>
            </div>
          )}
          {step === 3 && (
            <Field label="Registered address">
              <textarea className="textarea" rows={3} value={f.address} onChange={set('address')} placeholder="Street, city, country" autoFocus />
            </Field>
          )}
          {step === 4 && (
            <Field label="Official email" hint="Used on letterheads and for transactional notifications architecture.">
              <input className="input" value={f.email} onChange={set('email')} placeholder="secretariat@yourorg.example" autoFocus />
            </Field>
          )}
          {step === 5 && (
            <Field label="Telephone">
              <input className="input" value={f.phone} onChange={set('phone')} placeholder="+234 …" autoFocus />
            </Field>
          )}
          {step === 6 && (
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Administrator name" req><input className="input" value={f.adminName} onChange={set('adminName')} autoFocus /></Field>
              <Field label="Administrator email" req error={f.adminEmail && !/\S+@\S+\.\S+/.test(f.adminEmail) ? 'Enter a valid email' : undefined}>
                <input className="input" value={f.adminEmail} onChange={set('adminEmail')} placeholder="admin@yourorg.example" />
              </Field>
              <Field label="Job title"><input className="input" value={f.adminTitle} onChange={set('adminTitle')} placeholder="Registrar / CEO / Principal" /></Field>
              <Field label="Password" req error={f.adminPwd && f.adminPwd.length < 6 ? 'Minimum 6 characters' : undefined} hint="You will sign in with this password.">
                <input className="input" type="password" value={f.adminPwd} onChange={set('adminPwd')} />
              </Field>
            </div>
          )}
          {step === 7 && (
            <div>
              <p className="label">Departments <span className="text-ink-faint normal-case tracking-normal font-normal">(code drives reference numbers)</span></p>
              <div className="space-y-2">
                {deps.map((dp, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input flex-1" placeholder="Department name" value={dp.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDeps((arr) => arr.map((x, j) => (j === i ? { name: v, code: x.code || v.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() } : x)));
                      }} />
                    <input className="input !w-24 ref uppercase" placeholder="CODE" maxLength={4} value={dp.code}
                      onChange={(e) => setDeps((arr) => arr.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') } : x)))} />
                    <button className="btn-ghost !px-2.5" disabled={deps.length === 1} onClick={() => setDeps((arr) => arr.filter((_, j) => j !== i))} aria-label="Remove department">✕</button>
                  </div>
                ))}
              </div>
              <button className="btn-ghost mt-3" onClick={() => setDeps((arr) => [...arr, { name: '', code: '' }])}>+ Add department</button>
            </div>
          )}
          {step === 8 && (
            <Field label="Invite users (optional)" hint="One email per line. Invited users join as Staff with password “cortexa” in this demo.">
              <textarea className="textarea font-mono !text-[12px]" rows={6} value={f.emails} onChange={set('emails')} placeholder={'jane.doe@yourorg.example\njohn.smith@yourorg.example'} />
            </Field>
          )}
          {step === 9 && (
            <div>
              <Field label="Reference prefix" req hint="Automatic numbering: PREFIX / DEPT / YEAR / sequence. Duplicates are prevented by the registry.">
                <input className="input !w-40 ref !text-[15px] tracking-widest" value={f.refPrefix} onChange={set('refPrefix')} />
              </Field>
              <div className="mt-4 border border-brass-300 bg-brass-50 rounded-md px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brass-700">Live preview</p>
                <p className="ref text-[19px] font-semibold text-ink mt-1">{previewRef}</p>
                <p className="text-[11px] text-ink-soft mt-1">First incoming entry for {deps[0]?.name || 'Administration'} next year.</p>
              </div>
            </div>
          )}

          {err && <p className="mt-4 text-[12px] font-medium text-clay-600 bg-clay-50 border border-clay-100 rounded px-2.5 py-1.5">{err}</p>}
        </div>

        <div className="flex justify-between mt-4">
          <button className="btn-ghost" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}><IcChevL size={14} /> Back</button>
          {step < 9
            ? <button className="btn-primary" onClick={next}>Continue <IcChevR size={14} /></button>
            : <button className="btn-brass" onClick={finish}><IcCheck size={14} /> Create organisation & enter workspace</button>}
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
