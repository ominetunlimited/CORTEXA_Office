import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { CortexaSeal, IcChevL, IcShield, IcCheck, IcMail, IcClock, IcPlus, IcX, IcSeal } from '../components/icons';
import { Field, RoleBadge, ToastHost, Tabs } from '../components/ui';
import { OtpInput, CountrySelect, PasswordMeter, PasswordField, Spinner, Alert } from '../components/authbits';
import { cx, pad } from '../lib/utils';
import { maskEmail, OTP_RULES, isValidEmail, COUNTRIES, ORG_TYPE_LIST } from '../lib/security';
import type { OrgType } from '../lib/types';

type AuthScreen = 'signin' | 'register' | 'verify';

export function Login() {
  const { db, demoLogin } = useStore();
  const [screen, setScreen] = useState<AuthScreen>('signin');
  const [verifyEmail, setVerifyEmail] = useState('');

  const demoAccounts = useMemo(
    () => db.users.filter((u) => u.orgId === 'org_demo' && ['u_1', 'u_2', 'u_3', 'u_4'].includes(u.id)),
    [db.users],
  );

  return (
    <div className="min-h-screen flex ledger-bg">
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md anim-rise py-8">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="text-pine-700"><CortexaSeal size={38} /></span>
            <div>
              <p className="font-display font-extrabold text-[18px] text-ink leading-none">CORTEXA</p>
              <p className="text-[10px] text-ink-faint uppercase tracking-[0.14em] mt-0.5">Institutional Registry</p>
            </div>
          </div>

          {screen === 'signin' && <SignIn onRegister={() => setScreen('register')} onVerify={(em) => { setVerifyEmail(em); setScreen('verify'); }} demoAccounts={demoAccounts} demoLogin={demoLogin} />}
          {screen === 'register' && <Register onBack={() => setScreen('signin')} onVerify={(em) => { setVerifyEmail(em); setScreen('verify'); }} />}
          {screen === 'verify' && <Verify email={verifyEmail} onChangeEmail={() => setScreen('register')} onDone={() => setScreen('signin')} />}
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

/* ── brand panel ─────────────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[44%] xl:w-[40%] bg-pine-900 sidebar-texture text-pine-100 p-10 xl:p-14 relative overflow-hidden">
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
        <h1 className="font-display font-extrabold text-[30px] xl:text-[35px] leading-[1.12] text-paper mt-3 tracking-tight max-w-md">
          Every document has a history.<br />Every task has a deadline.<br />Every action leaves a record.
        </h1>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2.5 max-w-md">
          {[
            ['Correspondence registry', 'Incoming · outgoing · threaded'],
            ['Matters & case files', 'The complete story of an issue'],
            ['Executive workflow', 'Approvals · delegation · decisions'],
            ['Meetings & invitations', 'Calendar · minutes · action points'],
            ['Records vault', 'Versions · OCR text · retention'],
            ['Security by architecture', 'Tenancy · RBAC · audit trail'],
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
        <div className="flex items-center gap-2 mt-10 text-[10.5px] text-pine-300/80">
          <IcShield size={13} />
          <p>Email-verified accounts · salted password hashing · progressive brute-force lockout · session revocation · append-only audit</p>
        </div>
      </div>
    </div>
  );
}

/* ── sign in ─────────────────────────────────────────────────────────── */
function SignIn({ onRegister, onVerify, demoAccounts, demoLogin }: {
  onRegister: () => void; onVerify: (email: string) => void;
  demoAccounts: { id: string; name: string; email: string; role: string; title: string; color: string }[];
  demoLogin: (id: string) => void;
}) {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockS, setLockS] = useState(0);

  useEffect(() => {
    if (lockS <= 0) return;
    const t = window.setInterval(() => setLockS((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [lockS]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy || lockS > 0) return;
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    if (!pwd) { setError('Enter your password.'); return; }
    setError(''); setBusy(true);
    const r = await login(email, pwd);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'Unable to sign in.');
      if (r.lockedS) setLockS(r.lockedS);
      if (r.error?.includes('not been verified')) onVerify(email);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600">Workspace sign in</p>
      <h2 className="font-display font-extrabold text-[24px] text-ink tracking-tight mt-1">Open the registry</h2>
      <p className="text-[13px] text-ink-soft mt-1.5">Sign in to your organisation's secure workspace.</p>

      <form className="mt-5 space-y-3.5" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Official email" req>
          <input className="input" type="email" autoComplete="email" value={email} placeholder="you@organisation.gov"
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" req>
          <PasswordField value={pwd} onChange={setPwd} placeholder="••••••••" autoComplete="current-password" />
        </Field>
        <button type="submit" className="btn-primary w-full !h-10" disabled={busy || lockS > 0}>
          {busy ? <><Spinner /> Verifying credentials…</> : lockS > 0 ? <><IcClock size={14} /> Locked — retry in {lockS}s</> : 'Sign in securely'}
        </button>
      </form>

      <p className="text-[13px] text-ink-soft mt-4 text-center">
        New institution?{' '}
        <button className="font-semibold text-pine-700 hover:underline cursor-pointer" onClick={onRegister}>Create your organisation</button>
      </p>

      <div className="mt-7">
        <p className="label">Demo tenant — Cortexa Demo Foundation</p>
        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((u) => (
            <button key={u.id} onClick={() => demoLogin(u.id)}
              className="card px-3 py-2.5 text-left hover:border-pine-400 hover:-translate-y-px hover:shadow-md transition-all cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full text-white font-display font-bold" style={{ width: 26, height: 26, background: u.color, fontSize: 10 }}>
                  {u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink truncate">{u.name}</span>
                  <span className="block text-[10px] text-ink-faint">{u.role}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10.5px] text-ink-faint mt-2">Documented demo credential for manual sign-in: <span className="font-mono">admin@cortexa.demo</span> · password <span className="font-mono">cortexa</span></p>
      </div>
    </div>
  );
}

/* ── register ────────────────────────────────────────────────────────── */
function Register({ onBack, onVerify }: { onBack: () => void; onVerify: (email: string) => void }) {
  const { registerSignup } = useStore();
  const [f, setF] = useState({ firstName: '', lastName: '', orgName: '', orgType: '' as OrgType | '', country: 'NG', email: '', pwd: '', pwd2: '', terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState('');
  const [busy, setBusy] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeQ, setTypeQ] = useState('');

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required.';
    if (!f.lastName.trim()) e.lastName = 'Last name is required.';
    if (!f.orgName.trim()) e.orgName = 'Organisation name is required.';
    if (!f.orgType) e.orgType = 'Select an organisation type.';
    if (!f.country) e.country = 'Select a country.';
    if (!isValidEmail(f.email)) e.email = 'Enter a valid email address.';
    if (f.pwd.length < 8) e.pwd = 'Password must contain at least 8 characters.';
    if (f.pwd2 !== f.pwd) e.pwd2 = 'Passwords do not match.';
    if (!f.terms) e.terms = 'You must accept the terms to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setTopError('');
    if (!validate()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 650));
    const r = registerSignup({ firstName: f.firstName, lastName: f.lastName, orgName: f.orgName, orgType: f.orgType as OrgType, country: f.country, email: f.email, password: f.pwd });
    setBusy(false);
    if (!r.ok) {
      if (r.field) setErrors({ [r.field]: r.error ?? 'Invalid input.' });
      else setTopError(r.error ?? 'Unable to create the organisation right now. Please try again.');
      return;
    }
    onVerify(f.email);
  };

  const typeList = ORG_TYPE_LIST.filter((t) => !typeQ || t.toLowerCase().includes(typeQ.toLowerCase()));

  return (
    <div>
      <button className="btn-ghost btn-sm mb-4" onClick={onBack}><IcChevL size={13} /> Back to sign in</button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600">Create organisation</p>
      <h2 className="font-display font-extrabold text-[22px] text-ink tracking-tight mt-1 leading-tight">Bring your organisation's office into one secure workspace.</h2>
      <p className="text-[13px] text-ink-soft mt-1.5">You'll become the organisation administrator. We'll verify your email with a six-digit code.</p>

      <form className="mt-5 space-y-3" onSubmit={submit} noValidate>
        {topError && <Alert>{topError}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" req error={errors.firstName}>
            <input className="input" autoComplete="given-name" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
          <Field label="Last name" req error={errors.lastName}>
            <input className="input" autoComplete="family-name" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
        </div>
        <Field label="Organisation name" req error={errors.orgName}>
          <input className="input" placeholder="e.g. Federal Ministry of Works" value={f.orgName} onChange={(e) => set('orgName', e.target.value)} />
        </Field>

        <div>
          <label className="label">Organisation type<span className="text-clay-600 ml-0.5">*</span></label>
          <div className="relative">
            <button type="button" className="input text-left cursor-pointer" onClick={() => setTypeOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={typeOpen}>
              <span className={f.orgType ? '' : 'text-ink-faint'}>{f.orgType || 'Select organisation type'}</span>
            </button>
            {typeOpen && (
              <div className="absolute z-40 mt-1.5 left-0 right-0 card shadow-xl anim-pop overflow-hidden">
                <input autoFocus className="input !rounded-none !border-x-0 !border-t-0 !h-8 !text-[12.5px]" placeholder="Search types…" value={typeQ} onChange={(e) => setTypeQ(e.target.value)} />
                <div className="max-h-44 overflow-y-auto">
                  {typeList.map((t) => (
                    <button type="button" key={t} onClick={() => { set('orgType', t); setTypeOpen(false); setTypeQ(''); }}
                      className={cx('w-full text-left px-3 py-1.5 text-[13px] cursor-pointer hover:bg-pine-50', f.orgType === t ? 'text-pine-700 font-semibold' : 'text-ink')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {errors.orgType && <p className="text-[11px] text-clay-600 font-medium mt-1">{errors.orgType}</p>}
        </div>

        <CountrySelect value={f.country} onChange={(v) => set('country', v)} />

        <Field label="Official email" req error={errors.email}>
          <input className="input" type="email" autoComplete="email" placeholder="administrator@organisation.gov" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" req error={errors.pwd}>
            <PasswordField value={f.pwd} onChange={(v) => set('pwd', v)} autoComplete="new-password" />
            <PasswordMeter pwd={f.pwd} showHint />
          </Field>
          <Field label="Confirm password" req error={errors.pwd2}>
            <PasswordField value={f.pwd2} onChange={(v) => set('pwd2', v)} autoComplete="new-password" />
          </Field>
        </div>

        <label className={cx('flex items-start gap-2.5 text-[12.5px] text-ink-soft cursor-pointer rounded-md border px-3 py-2.5 transition-colors',
          errors.terms ? 'border-clay-500 bg-clay-50' : f.terms ? 'border-pine-400 bg-pine-50' : 'border-line hover:border-pine-300')}>
          <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} className="mt-0.5 accent-pine-700" />
          <span>I accept the Cortexa terms of service and confirm I am authorised to register this organisation. Institutional records will be governed by the workspace's audit trail.</span>
        </label>
        {errors.terms && <p className="text-[11px] text-clay-600 font-medium -mt-1">{errors.terms}</p>}

        <button type="submit" className="btn-brass w-full !h-10" disabled={busy}>
          {busy ? <><Spinner /> Creating organisation…</> : 'Create organisation'}
        </button>
      </form>

      <p className="text-[13px] text-ink-soft mt-4 text-center">
        Already have an account?{' '}
        <button className="font-semibold text-pine-700 hover:underline cursor-pointer" onClick={onBack}>Sign in</button>
      </p>
    </div>
  );
}

/* ── verify ──────────────────────────────────────────────────────────── */
function Verify({ email, onChangeEmail, onDone }: { email: string; onChangeEmail: () => void; onDone: () => void }) {
  const { verifyEmail, resendCode, changeSignupEmail, demoMailFor, me, org } = useStore();
  const [err, setErr] = useState('');
  const [expired, setExpired] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentAt, setSentAt] = useState(() => demoMailFor(email)?.sentAt ?? Date.now());
  const [now, setNow] = useState(Date.now());
  const [otpKey, setOtpKey] = useState(0);      /* remount input on new code / error */
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const expiresAt = sentAt + OTP_RULES.ttlMs;
  const remainS = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const mm = pad(Math.floor(remainS / 60), 2);
  const ss = pad(remainS % 60, 2);
  const relay = demoMailFor(email);

  /* if verification completed (me set) show success then advance */
  useEffect(() => {
    if (me && !success) {
      setSuccess(true);
      const t = window.setTimeout(() => { onDone(); }, 1300);
      return () => window.clearTimeout(t);
    }
  }, [me, success, onDone]);

  const onComplete = async (code: string) => {
    setVerifying(true); setErr('');
    await new Promise((r) => setTimeout(r, 500));
    const r = verifyEmail(email, code);
    setVerifying(false);
    if (!r.ok) {
      setErr(r.error ?? 'Verification failed.');
      if (r.expired) setExpired(true);
      setOtpKey((k) => k + 1);
    }
  };

  const resend = () => {
    const r = resendCode(email);
    if (!r.ok) {
      setErr(r.error ?? 'Unable to resend right now.');
      if (r.waitS) setCooldown(r.waitS);
      return;
    }
    setErr(''); setExpired(false);
    setSentAt(Date.now());
    setCooldown(Math.ceil(OTP_RULES.resendCooldownMs / 1000));
    setOtpKey((k) => k + 1);
  };

  const doChangeEmail = () => {
    if (!isValidEmail(newEmail)) { setErr('Enter a valid email address.'); return; }
    const r = changeSignupEmail(email, newEmail);
    if (!r.ok) { setErr(r.error ?? 'Unable to change email.'); return; }
    setErr(''); setExpired(false); setChanging(false);
    setSentAt(Date.now());
    setCooldown(Math.ceil(OTP_RULES.resendCooldownMs / 1000));
    setOtpKey((k) => k + 1);
  };

  if (success) {
    return (
      <div className="text-center py-10 anim-pop">
        <span className="inline-flex w-16 h-16 rounded-full bg-moss-100 border border-moss-600/30 text-moss-700 items-center justify-center"><IcCheck size={30} /></span>
        <h2 className="font-display font-extrabold text-[22px] text-ink mt-4">Email verified</h2>
        <p className="text-[13px] text-ink-soft mt-1.5">Account activated. Opening {org?.setupComplete ? 'your dashboard' : 'organisation setup'}…</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600">Identity verification</p>
      <h2 className="font-display font-extrabold text-[24px] text-ink tracking-tight mt-1">Check your inbox</h2>
      <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">
        We've sent a 6-digit verification code to <span className="font-semibold text-ink font-mono text-[12.5px]">{maskEmail(email)}</span>.
        Enter it below to activate your account.
      </p>

      <div className="mt-5 space-y-3">
        {err && !expired && <Alert>{err}</Alert>}
        {expired && (
          <Alert>
            <span className="font-semibold">Code expired.</span> Verification codes are valid for 10 minutes and can only be used once.
          </Alert>
        )}

        {!expired ? (
          <>
            <OtpInput key={otpKey} onComplete={onComplete} error={!!err} disabled={verifying} />
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-ink-faint"><IcClock size={13} /> Code expires in <span className="font-mono font-semibold text-ink">{mm}:{ss}</span></span>
              {verifying && <span className="flex items-center gap-1.5 text-pine-700 font-medium"><Spinner size={12} /> Verifying…</span>}
            </div>
          </>
        ) : (
          <button className="btn-primary w-full" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Send new code in ${cooldown}s` : 'Send new code'}
          </button>
        )}

        <div className="card p-3 text-[12px] text-ink-soft leading-relaxed">
          Didn't receive the code?{' '}
          {cooldown > 0
            ? <span className="text-ink-faint">Resend in <span className="font-mono font-semibold">{cooldown}s</span>.</span>
            : <button className="font-semibold text-pine-700 hover:underline cursor-pointer" onClick={resend}>Resend code</button>}
          {' · '}
          {changing ? (
            <span className="inline-flex items-center gap-1.5 align-middle">
              <input className="input !h-7 !w-44 !text-[12px] inline-block" placeholder="new@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoFocus />
              <button className="font-semibold text-pine-700 hover:underline cursor-pointer" onClick={doChangeEmail}>Save</button>
            </span>
          ) : (
            <button className="font-semibold text-pine-700 hover:underline cursor-pointer" onClick={() => { setChanging(true); setNewEmail(email); }}>Change email</button>
          )}
        </div>

        {/* Demo mail relay — stands in for the transactional SMTP provider.
            In production the six-digit code is delivered by the mail service
            alone and never appears in client state, URLs or logs. */}
        {relay && (
          <div className="border border-dashed border-brass-400/60 rounded-lg bg-brass-50/60 p-3.5 anim-fade">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-brass-700 flex items-center gap-1.5"><IcMail size={12} /> Demo mail relay · simulated delivery</p>
            <div className="mt-2 card !bg-white p-3">
              <p className="text-[11px] text-ink-faint">From: <span className="font-mono">verify@cortexa.app</span> · Subject: <span className="font-semibold text-ink">Verify your CORTEXA account</span></p>
              <p className="text-[12px] text-ink-soft mt-1.5">Your Cortexa verification code is:</p>
              <p className="font-mono font-bold text-[26px] tracking-[0.35em] text-pine-800 mt-1 select-all">{relay.code}</p>
              <p className="text-[10.5px] text-ink-faint mt-1.5">Valid for 10 minutes. If you didn't request this, you can ignore this email. Never share this code.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── post-verification setup wizard (also used for incomplete orgs) ──── */
export function SetupWizard() {
  const { me, org, completeSetup, departments } = useStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState(org?.address ?? '');
  const [phone, setPhone] = useState(org?.phone ?? '');
  const [initials, setInitials] = useState(org?.logoInitials ?? (org?.name.slice(0, 2) ?? 'OR').toUpperCase());
  const [prefix, setPrefix] = useState(org?.refPrefix ?? (org?.name.slice(0, 3) ?? 'ORG').toUpperCase());
  const [deps, setDeps] = useState<{ name: string; code: string }[]>(
    departments.length ? departments.map((dp) => ({ name: dp.name, code: dp.code })) : [
      { name: 'Administration', code: 'ADM' },
      { name: 'Programmes', code: 'PRG' },
      { name: 'Finance', code: 'FIN' },
    ],
  );
  const [invites, setInvites] = useState<string[]>(['']);
  const [err, setErr] = useState('');
  const country = COUNTRIES.find((c) => c.iso2 === (org?.country ?? me?.country));

  const STEPS = ['Organisation profile', 'Departments', 'Invite users', 'Reference format'];
  const year = new Date().getFullYear();

  const finish = async () => {
    setBusy(true); setErr('');
    await new Promise((r) => setTimeout(r, 600));
    const r = completeSetup({
      address, phone: phone ? `${country?.dial ?? ''} ${phone}`.trim() : '',
      logoInitials: initials, refPrefix: prefix,
      departments: deps.filter((dp) => dp.name.trim() && dp.code.trim()),
      inviteEmails: invites.filter((e) => e.trim()),
    });
    setBusy(false);
    if (!r.ok) setErr(r.error ?? 'Unable to finish setup.');
  };

  const validStep = () => {
    if (step === 0) return address.trim().length > 0;
    if (step === 1) return deps.filter((dp) => dp.name.trim() && dp.code.trim()).length > 0;
    return true;
  };

  return (
    <div className="min-h-screen ledger-bg flex flex-col">
      <header className="px-6 py-4 border-b border-line flex items-center gap-3">
        <span className="text-pine-700"><CortexaSeal size={34} /></span>
        <div>
          <p className="font-display font-extrabold text-[16px] text-ink leading-none">CORTEXA</p>
          <p className="text-[10.5px] text-ink-faint mt-0.5">Setting up <span className="font-semibold text-ink">{org?.name}</span></p>
        </div>
        <span className="ml-auto chip bg-moss-100 text-moss-700"><IcCheck size={11} /> Email verified</span>
      </header>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-2xl anim-rise">
          <div className="flex items-center gap-1 mb-6" role="tablist" aria-label="Setup steps">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <button onClick={() => i < step && setStep(i)} disabled={i > step}
                  className={cx('flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                    i === step ? 'bg-pine-700 text-pine-50' : i < step ? 'text-pine-700 hover:bg-pine-50 cursor-pointer' : 'text-ink-faint')}>
                  <span className={cx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border',
                    i === step ? 'border-pine-300' : i < step ? 'border-pine-600 bg-pine-600 text-white' : 'border-line')}>
                    {i < step ? <IcCheck size={10} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </button>
                {i < STEPS.length - 1 && <span className={cx('h-px flex-1', i < step ? 'bg-pine-400' : 'bg-line')} />}
              </React.Fragment>
            ))}
          </div>

          <div className="card p-6">
            {err && <div className="mb-3"><Alert>{err}</Alert></div>}

            {step === 0 && (
              <div className="space-y-4 anim-fade">
                <div>
                  <h3 className="font-display font-bold text-[18px] text-ink">Organisation profile</h3>
                  <p className="text-[12.5px] text-ink-soft mt-1">This appears on registers, dispatches and meeting invitations.</p>
                </div>
                <Field label="Registered address" req>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, district, city" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={`Telephone (${country?.dial ?? 'dial code'})`} hint="Stored in normalised international format.">
                    <div className="flex gap-2">
                      <span className="input !w-20 text-center ref shrink-0">{country?.dial ?? '+'}</span>
                      <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="803 123 4567" />
                    </div>
                  </Field>
                  <Field label="Logo initials" hint="Used for the workspace seal.">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-lg bg-pine-900 text-brass-400 font-display font-extrabold text-[16px] flex items-center justify-center shrink-0">{initials.slice(0, 3)}</span>
                      <input className="input" maxLength={3} value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} />
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3 anim-fade">
                <div>
                  <h3 className="font-display font-bold text-[18px] text-ink">Departments</h3>
                  <p className="text-[12.5px] text-ink-soft mt-1">Each department gets a short code used in reference numbers and reporting.</p>
                </div>
                {deps.map((dp, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="input flex-1" placeholder="Department name" value={dp.name}
                      onChange={(e) => setDeps((d) => d.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input className="input !w-24 text-center font-mono uppercase" maxLength={4} placeholder="CODE" value={dp.code}
                      onChange={(e) => setDeps((d) => d.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') } : x)))} />
                    <button type="button" aria-label="Remove department" className="btn-ghost btn-sm !px-2 !text-clay-600" disabled={deps.length <= 1}
                      onClick={() => setDeps((d) => d.filter((_, j) => j !== i))}><IcX size={13} /></button>
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-sm" onClick={() => setDeps((d) => [...d, { name: '', code: '' }])}><IcPlus size={12} /> Add department</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 anim-fade">
                <div>
                  <h3 className="font-display font-bold text-[18px] text-ink">Invite your team</h3>
                  <p className="text-[12.5px] text-ink-soft mt-1">Optional — up to 20 seats on this plan. Invited users verify their email before activation and sign in with the temporary credential <span className="font-mono">cortexa</span>.</p>
                </div>
                {invites.map((em, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="input flex-1" type="email" placeholder="colleague@organisation.gov" value={em}
                      onChange={(e) => setInvites((v) => v.map((x, j) => (j === i ? e.target.value : x)))} />
                    <button type="button" aria-label="Remove invite" className="btn-ghost btn-sm !px-2 !text-clay-600" onClick={() => setInvites((v) => v.filter((_, j) => j !== i))}><IcX size={13} /></button>
                  </div>
                ))}
                <button type="button" className="btn-ghost btn-sm" disabled={invites.length >= 19} onClick={() => setInvites((v) => [...v, ''])}><IcPlus size={12} /> Add invite</button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 anim-fade">
                <div>
                  <h3 className="font-display font-bold text-[18px] text-ink">Reference number format</h3>
                  <p className="text-[12.5px] text-ink-soft mt-1">Every correspondence, document and matter is numbered automatically. Duplicates are impossible.</p>
                </div>
                <Field label="Organisation prefix" req hint="2–5 letters.">
                  <input className="input !w-40 font-mono uppercase" maxLength={5} value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
                </Field>
                <div className="card !bg-pine-900 border-pine-800 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brass-400">Live preview</p>
                  <p className="font-mono text-[17px] text-paper mt-1.5">{prefix || 'ORG'}/{deps[0]?.code || 'ADM'}/{year}/0001</p>
                  <p className="font-mono text-[12px] text-pine-300 mt-1">{prefix || 'ORG'}/OUT/{year}/0001 · {prefix || 'ORG'}/{deps[1]?.code || 'FIN'}/{year}/0001</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-line-soft">
              <button className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
                <IcChevL size={13} /> Back
              </button>
              {step < 3 ? (
                <button className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!validStep()}>Continue</button>
              ) : (
                <button className="btn-brass" onClick={finish} disabled={busy || !prefix.trim()}>
                  {busy ? <><Spinner /> Preparing workspace…</> : <><IcSeal size={14} /> Open the registry</>}
                </button>
              )}
            </div>
          </div>
          <p className="text-[10.5px] text-ink-faint text-center mt-3">Signed in as {me?.name} · Organisation Admin — every setup action is written to the audit trail.</p>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}

void [Tabs, RoleBadge];
