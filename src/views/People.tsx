import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, EmptyState, Avatar, Chip, Field, Modal, RoleBadge } from '../components/ui';
import { QAHost } from '../components/quick';
import type { Contact, Department } from '../lib/types';
import { ROLES, type Role } from '../lib/types';
import { cx } from '../lib/utils';
import { IcBook, IcSearch, IcPlus, IcColumns, IcUsers, IcEnvelope, IcCheckSquare, IcEdit, IcMail } from '../components/icons';

/* ── contacts ────────────────────────────────────────────────────────── */
export function ContactsView() {
  const { db, me, canUser, updateContact } = useStore();
  const [q, setQ] = useState('');
  const [org, setOrg] = useState('');
  const [qa, setQa] = useState(false);
  const [edit, setEdit] = useState<Contact | null>(null);

  const contacts = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const orgs = Array.from(new Set(db.contacts.filter((c) => c.orgId === me?.orgId).map((c) => c.organisation).filter(Boolean))).sort();
    const list = db.contacts
      .filter((c) => c.orgId === me?.orgId)
      .filter((c) => !org || c.organisation === org)
      .filter((c) => !qq || [c.name, c.organisation, c.position, c.email, c.notes, ...c.tags].some((s) => s?.toLowerCase().includes(qq)))
      .sort((a, b) => a.organisation.localeCompare(b.organisation) || a.name.localeCompare(b.name));
    return { list, orgs };
  }, [db.contacts, me, q, org]);

  return (
    <div>
      <PageHead kicker="Institutional directory" title="Contacts & counterparties"
        sub="Ministries, donors, partners and vendors — the people behind every reference number.">
        {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={15} /> Add contact</button>}
      </PageHead>

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"><IcSearch size={14} /></span>
          <input className="input !pl-8" placeholder="Search people, organisations, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={org} onChange={(e) => setOrg(e.target.value)}>
          <option value="">All organisations</option>
          {contacts.orgs.map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="ref text-ink-faint ml-auto">{contacts.list.length} contact{contacts.list.length === 1 ? '' : 's'}</span>
      </div>

      {contacts.list.length === 0 ? (
        <div className="card"><EmptyState icon={<IcBook size={20} />} title="No contacts yet"
          body="Build the institutional directory: counterparties at ministries, donors, partners and vendors.">
          {canUser('create') && <button className="btn-primary" onClick={() => setQa(true)}><IcPlus size={14} /> Add the first contact</button>}
        </EmptyState></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
          {contacts.list.map((c) => (
            <div key={c.id} className="card p-4 hover:border-pine-300 transition-colors group">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} color="#3E5C76" size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink leading-tight">{c.name}</p>
                  <p className="text-[11.5px] text-ink-faint">{c.position || '—'}</p>
                  <p className="text-[12px] text-pine-700 font-medium mt-0.5 truncate">{c.organisation}</p>
                </div>
                {canUser('create') && (
                  <button className="btn-ghost btn-sm !px-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEdit(c)} title="Edit contact" aria-label="Edit contact"><IcEdit size={13} /></button>
                )}
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-ink-soft">
                {c.email && <p className="flex items-center gap-2 truncate"><IcMail size={12} className="text-ink-faint shrink-0" />{c.email}</p>}
                {c.phone && <p className="flex items-center gap-2"><span className="text-ink-faint text-[12px]">☏</span>{c.phone}</p>}
              </div>
              {c.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2.5">
                  {c.tags.map((t) => <span key={t} className="chip bg-pine-50 text-pine-700 border border-pine-100">{t}</span>)}
                </div>
              )}
              {c.notes && <p className="text-[11.5px] text-ink-faint mt-2 leading-snug line-clamp-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <QAHost open={qa ? 'contact' : null} onClose={() => setQa(false)} />
      {edit && <ContactEditor c={edit} onClose={() => setEdit(null)} onSave={(patch) => { updateContact(edit.id, patch); setEdit(null); }} />}
    </div>
  );
}

function ContactEditor({ c, onClose, onSave }: { c: Contact; onClose: () => void; onSave: (p: Partial<Contact>) => void }) {
  const [f, setF] = useState({ ...c, tags: c.tags.join(', ') });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} title="Edit contact" subtitle={c.organisation} w="max-w-xl"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ name: f.name, position: f.position, organisation: f.organisation, email: f.email, phone: f.phone, address: f.address, website: f.website, notes: f.notes, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean) })}>Save changes</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name" req><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Position"><input className="input" value={f.position} onChange={set('position')} /></Field>
        <Field label="Organisation"><input className="input" value={f.organisation} onChange={set('organisation')} /></Field>
        <Field label="Email"><input className="input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Website"><input className="input" value={f.website} onChange={set('website')} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className="input" value={f.address} onChange={set('address')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notes"><textarea className="textarea" rows={2} value={f.notes} onChange={set('notes')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Tags"><input className="input" value={f.tags as string} onChange={set('tags')} /></Field></div>
      </div>
    </Modal>
  );
}

/* ── departments ─────────────────────────────────────────────────────── */
export function DepartmentsView() {
  const { db, me, users, canUser, addDepartment, updateDepartment, toast } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');

  const departments = db.departments.filter((d) => d.orgId === me?.orgId);

  const counts = (depId: string) => ({
    users: users.filter((u) => u.departmentId === depId && u.active).length,
    corr: db.correspondence.filter((c) => c.orgId === me?.orgId && c.departmentId === depId && !c.archived).length,
    tasks: db.tasks.filter((t) => t.orgId === me?.orgId && t.departmentId === depId && !t.archived && !['Completed', 'Cancelled'].includes(t.status)).length,
    files: db.documents.filter((d) => d.orgId === me?.orgId && d.departmentId === depId && !d.archived).length,
  });

  const submitAdd = () => {
    if (!name.trim() || !code.trim()) return;
    const r = addDepartment({ name: name.trim(), code: code.trim().toUpperCase(), description: desc.trim() });
    if (!r.ok) { toast(r.error ?? 'Unable to create department.', 'error'); return; }
    toast('Department created');
    setAddOpen(false); setName(''); setCode(''); setDesc('');
  };

  return (
    <div>
      <PageHead kicker="Organisational structure" title="Departments"
        sub="Department codes drive the reference numbering system — ADM, PRG, FIN…">
        {canUser('manageDept') && <button className="btn-primary" onClick={() => setAddOpen(true)}><IcPlus size={15} /> New department</button>}
      </PageHead>

      {departments.length === 0 ? (
        <div className="card"><EmptyState icon={<IcColumns size={20} />} title="No departments" body="Create departments to organise correspondence, files and people — and to structure reference numbers." /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
          {departments.map((dep) => {
            const head = users.find((u) => u.id === dep.headId);
            const c = counts(dep.id);
            return (
              <div key={dep.id} className="card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-md bg-pine-900 text-brass-400 font-display font-extrabold text-[13px] flex items-center justify-center tracking-wide">{dep.code}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{dep.name}</h3>
                    <p className="text-[11px] text-ink-faint">Ref code · {dep.code}</p>
                  </div>
                </div>
                <p className="text-[12px] text-ink-soft mt-2.5 leading-relaxed min-h-[2.2em]">{dep.description || 'No description.'}</p>
                <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                  {([[c.users, 'staff', <IcUsers key="i" size={12} />], [c.corr, 'corresp.', <IcEnvelope key="i" size={12} />], [c.tasks, 'tasks', <IcCheckSquare key="i" size={12} />], [c.files, 'files', <IcBook key="i" size={12} />]] as [number, string, React.ReactNode][]).map(([n, l, ic]) => (
                    <div key={l} className="rounded-md bg-paper border border-line-soft py-1.5">
                      <p className="font-display font-extrabold text-[15px] text-pine-700 leading-none">{n}</p>
                      <p className="text-[9px] uppercase tracking-wider text-ink-faint mt-1 flex items-center justify-center gap-1">{ic}{l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="label">Department head</p>
                  <select className="input" value={dep.headId ?? ''} disabled={!canUser('manageDept')}
                    onChange={(e) => updateDepartment(dep.id, { headId: e.target.value || undefined })}>
                    <option value="">— Not appointed —</option>
                    {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
                  </select>
                  {head && (
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar name={head.name} color={head.color} size={24} />
                      <span className="text-[12px] text-ink-soft">{head.title}</span>
                      <RoleBadge role={head.role} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New department" subtitle="The code appears in every reference number this department registers"
        footer={<><button className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={!name.trim() || code.trim().length < 2} onClick={submitAdd}>Create department</button></>}>
        <div className="space-y-3">
          <Field label="Department name" req><input className="input" value={name} onChange={(e) => { setName(e.target.value); if (!code) setCode(e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()); }} placeholder="e.g. Procurement" /></Field>
          <Field label="Code" req hint="2–4 letters, used as ORG/CODE/YEAR/0001"><input className="input !w-32 ref uppercase" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></Field>
          <Field label="Description"><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}

void cx; void Chip;
