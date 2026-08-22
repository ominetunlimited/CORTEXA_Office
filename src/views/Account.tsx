import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, Tabs, Field, Chip, Avatar, Confirm } from '../components/ui';
import { PasswordField, PasswordMeter, CountrySelect, Spinner, Alert } from '../components/authbits';
import { COUNTRIES } from '../lib/security';
import { cx, relTime, fmtDateTime, fileSizeLabel } from '../lib/utils';
import { getOfflineDocs, removeDocOffline, offlineStorageKb, queueSize } from '../lib/offline';
import {
  platformAuthenticatorAvailable, isEnrolled, enrolledLabel, enrollBiometric, verifyBiometric, clearEnrollment,
} from '../lib/biometrics';
import { IcCheck, IcShield, IcLock, IcLogout, IcClock, IcArchive, IcFile, IcFingerprint } from '../components/icons';

export function Account() {
  const { me, departments } = useStore();
  const [tab, setTab] = useState('profile');
  if (!me) return null;
  const dept = departments.find((dp) => dp.id === me.departmentId);
  return (
    <div className="max-w-4xl">
      <PageHead kicker="Your account" title="Profile & security"
        sub="Manage how you appear on the register, how you authenticate, and which devices hold live sessions." />
      <div className="card p-4 mb-4 flex items-center gap-4">
        <Avatar name={me.name} color={me.color} size={52} />
        <div className="min-w-0">
          <p className="font-display font-bold text-[17px] text-ink">{me.name}</p>
          <p className="text-[12.5px] text-ink-faint">{me.title} · {dept?.name ?? 'No department'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip bg-moss-100 text-moss-700"><IcCheck size={11} /> Email verified</span>
          <span className="chip bg-pine-100 text-pine-700">{me.role}</span>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'profile', label: 'Profile' },
        { id: 'security', label: 'Security' },
        { id: 'activity', label: 'Login activity' },
        { id: 'offline', label: 'Offline files' },
      ]} />
      <div className="pt-4">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'offline' && <OfflineTab />}
      </div>
    </div>
  );
}

/* ── profile ─────────────────────────────────────────────────────────── */
function ProfileTab() {
  const { me, updateProfile } = useStore();
  const [name, setName] = useState(me?.name ?? '');
  const [title, setTitle] = useState(me?.title ?? '');
  const [phone, setPhone] = useState((me?.phone ?? '').replace(/^\+\d+\s?/, ''));
  const [country, setCountry] = useState(me?.country ?? 'NG');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const dial = COUNTRIES.find((c) => c.iso2 === country)?.dial ?? '+';

  const save = async () => {
    if (!name.trim()) { setErr('Name cannot be empty.'); return; }
    setErr(''); setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    updateProfile({ name: name.trim(), title: title.trim(), phone: phone ? `${dial} ${phone}`.trim() : undefined, country });
    setBusy(false);
  };

  return (
    <div className="card p-5 max-w-xl space-y-4">
      {err && <Alert>{err}</Alert>}
      <Field label="Full name" req>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Job title">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={`Telephone (${dial})`}>
          <div className="flex gap-2">
            <span className="input !w-20 text-center ref shrink-0">{dial}</span>
            <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))} />
          </div>
        </Field>
        <div><CountrySelect value={country} onChange={setCountry} label="Country" /></div>
      </div>
      <div>
        <p className="label">Email · administrator-controlled</p>
        <p className="text-[13px] text-ink-faint flex items-center gap-2"><IcLock size={13} /> {me?.email} — email changes are processed by your Organisation Admin.</p>
      </div>
      <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <><Spinner /> Saving…</> : 'Save changes'}</button>
    </div>
  );
}

/* ── security ────────────────────────────────────────────────────────── */
function SecurityTab() {
  const { me, changePassword, mySessions, revokeSession, revokeOtherSessions } = useStore();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [revokeAsk, setRevokeAsk] = useState(false);
  const currentId = useStore().db.session.sessionId;

  const submit = async () => {
    setOk(''); setErr('');
    if (!cur || !next) { setErr('Enter your current password and a new password.'); return; }
    if (next !== conf) { setErr('New passwords do not match.'); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const r = changePassword(cur, next);
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? 'Unable to change password.'); return; }
    setOk('Password changed. All other sessions were signed out.');
    setCur(''); setNext(''); setConf('');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><IcLock size={15} className="text-pine-600" /> Password</h3>
          <p className="text-[12px] text-ink-faint mt-1">Salted and hashed — never stored or transmitted in plain text. Changing it revokes other sessions.</p>
          <p className="text-[12px] text-ink-soft mt-2">Last changed: <span className="font-semibold">{me?.pwdChangedAt ? fmtDateTime(me.pwdChangedAt) : '—'}</span></p>
          <div className="space-y-3 mt-4">
            {err && <Alert>{err}</Alert>}
            {ok && <Alert kind="success">{ok}</Alert>}
            <Field label="Current password" req>
              <PasswordField value={cur} onChange={setCur} autoComplete="current-password" />
            </Field>
            <Field label="New password" req>
              <PasswordField value={next} onChange={setNext} autoComplete="new-password" />
              <PasswordMeter pwd={next} showHint />
            </Field>
            <Field label="Confirm new password" req>
              <PasswordField value={conf} onChange={setConf} autoComplete="new-password" />
            </Field>
            <button className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? <><Spinner /> Updating…</> : 'Change password'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><IcShield size={15} className="text-brass-600" /> Two-factor authentication</h3>
          <div className="flex items-center gap-2 mt-2">
            <Chip meta={{ label: 'Not configured', chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' }} />
          </div>
          <p className="text-[12px] text-ink-faint mt-2 leading-relaxed">
            The authentication layer is architected for TOTP second factors. In production this enrols an authenticator app and requires the code at sign-in — especially for administrative actions.
          </p>
        </div>

        <BiometricCard />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2"><IcClock size={15} className="text-steel-600" /> Active sessions</h3>
          <span className="ref text-ink-faint">{mySessions.length} active</span>
        </div>
        <p className="text-[12px] text-ink-faint mt-1">Sessions expire after 30 minutes idle or 12 hours absolute.</p>
        <div className="mt-3 space-y-2">
          {mySessions.length === 0 && <p className="text-[12.5px] text-ink-faint">No session records.</p>}
          {mySessions.map((s) => (
            <div key={s.id} className={cx('flex items-center gap-3 rounded-md border px-3 py-2.5', s.id === currentId ? 'border-pine-400 bg-pine-50/70' : 'border-line-soft')}>
              <span className={cx('dot', s.id === currentId ? 'bg-pine-500 live-dot' : 'bg-ink-faint')} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-ink flex items-center gap-2">
                  {s.device}
                  {s.id === currentId && <span className="chip bg-pine-100 text-pine-700">This device</span>}
                </p>
                <p className="text-[11px] text-ink-faint">IP {s.ip} · signed in {relTime(new Date(s.createdAt).toISOString())} · active {relTime(new Date(s.lastSeen).toISOString())}</p>
              </div>
              {s.id !== currentId && (
                <button className="btn-ghost btn-sm !text-clay-600" onClick={() => revokeSession(s.id)}><IcLogout size={12} /> Revoke</button>
              )}
            </div>
          ))}
        </div>
        {mySessions.length > 1 && (
          <button className="btn-danger w-full mt-3" onClick={() => setRevokeAsk(true)}>Sign out of all other sessions</button>
        )}
      </div>

      <Confirm open={revokeAsk} onClose={() => setRevokeAsk(false)} title="Sign out other sessions?" confirmLabel="Sign them out"
        body={<>Every session on this account except this device will be revoked immediately. The action is recorded in the audit trail.</>}
        onConfirm={revokeOtherSessions} />
    </div>
  );
}

/* ── login activity ──────────────────────────────────────────────────── */
function ActivityTab() {
  const { securityLog } = useStore();
  if (securityLog.length === 0) return <p className="text-[13px] text-ink-faint py-8 text-center">No security events recorded yet.</p>;
  return (
    <div className="card divide-y divide-line-soft overflow-hidden">
      {securityLog.map((e) => (
        <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
          <Chip meta={e.result === 'success'
            ? { label: 'Allowed', chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }
            : { label: 'Denied', chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-ink truncate">{e.action}</p>
            <p className="text-[11px] text-ink-faint truncate">{e.target} · {e.userName}</p>
          </div>
          <span className="text-[10.5px] font-mono text-ink-faint whitespace-nowrap">{relTime(e.at)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── offline files ───────────────────────────────────────────────────── */
function OfflineTab() {
  const { nav, toast } = useStore();
  const [docs, setDocs] = useState(() => getOfflineDocs());
  const queued = queueSize();
  const usedKb = offlineStorageKb();

  const refresh = () => setDocs(getOfflineDocs());
  const remove = (id: string) => {
    removeDocOffline(id);
    refresh();
    toast('Offline copy removed — the register record is untouched', 'info');
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="font-display font-extrabold text-[24px] leading-none text-pine-700">{docs.length}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint mt-1">Documents offline</p>
        </div>
        <div className="card p-4">
          <p className="font-display font-extrabold text-[24px] leading-none text-ink">{fileSizeLabel(usedKb)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint mt-1">Storage used</p>
        </div>
        <div className="card p-4">
          <p className={cx('font-display font-extrabold text-[24px] leading-none', queued ? 'text-brass-600' : 'text-moss-700')}>{queued}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint mt-1">Drafts awaiting sync</p>
        </div>
      </div>

      <div className="card p-4 border-brass-100 bg-brass-50/60">
        <p className="text-[12.5px] text-ink-soft leading-relaxed">
          <span className="font-semibold text-ink">Offline is deliberate.</span> Only documents you mark
          {" "}&ldquo;Make available offline&rdquo; are cached on this device. Removing a local copy never deletes the
          institutional record — it stays in the register. Records created while offline are labelled
          {" "}<span className="chip bg-brass-100 text-brass-700">DRAFT · OFFLINE</span> and reconciled automatically when you reconnect.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-3.5 pb-2.5 border-b border-line-soft flex items-center gap-2">
          <IcArchive size={15} className="text-pine-600" />
          <h3 className="font-display font-bold text-[14px] text-ink">Available offline</h3>
          <span className="ml-auto ref text-ink-faint">{docs.length} cached</span>
        </div>
        {docs.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-ink-faint">
            No documents are cached for offline use. Open a document and choose &ldquo;Make available offline&rdquo;.
          </p>
        ) : (
          <div className="divide-y divide-line-soft">
            {docs.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-pine-50 text-pine-600 flex items-center justify-center shrink-0"><IcFile size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink truncate">{d.title}</p>
                  <p className="text-[11px] text-ink-faint truncate">
                    <span className="ref">{d.fileNumber}</span> · {d.category} · {fileSizeLabel(d.sizeKb)} · saved {relTime(new Date(d.savedAt).toISOString())}
                  </p>
                </div>
                <span className="chip bg-moss-100 text-moss-700 shrink-0"><IcCheck size={10} /> Offline</span>
                <button className="btn-ghost btn-sm shrink-0" onClick={() => nav({ name: 'documents', id: d.id })}>Open</button>
                <button className="btn-ghost btn-sm !text-clay-600 shrink-0" onClick={() => remove(d.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── biometric unlock (WebAuthn) ────────────────────────────────────── */
function BiometricCard() {
  const { me } = useStore();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const userId = me?.id ?? '';

  React.useEffect(() => {
    let live = true;
    platformAuthenticatorAvailable().then((ok) => { if (live) setAvailable(ok); });
    return () => { live = false; };
  }, []);

  React.useEffect(() => { setEnrolled(isEnrolled(userId)); }, [userId]);

  if (!me) return null;

  const enroll = async () => {
    setBusy(true); setMsg(null);
    const r = await enrollBiometric(me.id, me.name);
    setBusy(false);
    if (r.ok) { setEnrolled(true); setMsg({ ok: true, text: 'Biometric unlock enrolled for this device.' }); }
    else setMsg({ ok: false, text: r.reason ?? 'Could not enrol.' });
  };

  const verify = async () => {
    setBusy(true); setMsg(null);
    const r = await verifyBiometric(me.id);
    setBusy(false);
    setMsg(r.ok
      ? { ok: true, text: 'Identity confirmed by your device authenticator.' }
      : { ok: false, text: r.reason ?? 'Verification failed — use your password.' });
  };

  const remove = () => { clearEnrollment(me.id); setEnrolled(false); setMsg({ ok: true, text: 'Biometric enrollment removed from this device.' }); };

  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-[15px] text-ink flex items-center gap-2">
        <IcFingerprint size={16} className="text-pine-600" /> Biometric unlock
      </h3>
      {available === null ? (
        <p className="text-[12px] text-ink-faint mt-2 flex items-center gap-2"><Spinner size={13} /> Checking this device…</p>
      ) : !available ? (
        <p className="text-[12px] text-ink-faint mt-2 leading-relaxed">
          No fingerprint / Face ID / Windows Hello authenticator is available in this browser, so biometric unlock is disabled here.
          You can always sign in with your password.
        </p>
      ) : (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Chip meta={enrolled
              ? { label: enrolledLabel(me.id) ?? 'Enrolled', chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }
              : { label: 'Not enrolled', chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' }} />
          </div>
          <p className="text-[12px] text-ink-faint mt-2 leading-relaxed">
            Uses your device's secure authenticator. The key never leaves the secure element; CORTEXA stores only a non-sensitive enrollment marker on this device.
          </p>
          {msg && <div className="mt-2"><Alert kind={msg.ok ? 'success' : 'error'}>{msg.text}</Alert></div>}
          <div className="flex flex-wrap gap-2 mt-3">
            {enrolled ? (
              <>
                <button className="btn-primary" onClick={verify} disabled={busy}>{busy ? <Spinner size={13} /> : <IcFingerprint size={14} />} Verify</button>
                <button className="btn-ghost !text-clay-600" onClick={remove} disabled={busy}>Remove</button>
              </>
            ) : (
              <button className="btn-primary" onClick={enroll} disabled={busy}>{busy ? <Spinner size={13} /> : <IcFingerprint size={14} />} Enrol this device</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
