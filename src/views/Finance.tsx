import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { PageHead, Stat, Chip, EmptyState, Tabs, Modal, Field, Seg, Avatar, Reveal } from '../components/ui';
import { cx, fmtDate, lastNMonthKeys, monthKey, monthLabel, dateOnly } from '../lib/utils';
import { EXP_STATUSES, INVOICE_STATUSES, type FinanceTxn, type ExpStatus, type InvoiceStatus } from '../lib/types';
import { IcPlus, IcDownload, IcChart, IcColumns, IcFile, IcUsers } from '../components/icons';

const EXP_META: Record<ExpStatus, { chip: string; dot: string }> = {
  Draft: { chip: 'bg-line-soft text-ink-soft', dot: 'bg-ink-faint' },
  Submitted: { chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
  'Pending Approval': { chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
  Approved: { chip: 'bg-pine-100 text-pine-700', dot: 'bg-pine-500' },
  Rejected: { chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' },
  Paid: { chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' },
  Cancelled: { chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' },
};
const INV_META: Record<InvoiceStatus, { chip: string; dot: string }> = {
  Received: { chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' },
  'Under Review': { chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
  Approved: { chip: 'bg-pine-100 text-pine-700', dot: 'bg-pine-500' },
  'Partially Paid': { chip: 'bg-steel-100 text-steel-600', dot: 'bg-steel-600' },
  Paid: { chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' },
  Disputed: { chip: 'bg-clay-100 text-clay-700', dot: 'bg-clay-500' },
  Cancelled: { chip: 'bg-line-soft text-ink-faint', dot: 'bg-ink-faint' },
};

type Tab = 'overview' | 'income' | 'expenditure' | 'budget' | 'pettycash' | 'vendors' | 'invoices';

export function FinanceView() {
  const { db, me, org, users, departments, canUser, fmtMoney, budgetSpent, pettyCashBalance } = useStore();
  const [tab, setTab] = useState<Tab>('overview');

  const fin = useMemo(() => db.finance.filter((t) => t.orgId === me?.orgId), [db.finance, me]);
  const vendors = useMemo(() => db.vendors.filter((v) => v.orgId === me?.orgId), [db.vendors, me]);
  const invoices = useMemo(() => db.invoices.filter((i) => i.orgId === me?.orgId), [db.invoices, me]);
  const budgets = useMemo(() => db.budgets.filter((b) => b.orgId === me?.orgId), [db.budgets, me]);

  const stats = useMemo(() => {
    const counted = fin.filter((t) => !['Rejected', 'Cancelled', 'Draft'].includes(t.status));
    const income = counted.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
    const spend = counted.filter((t) => t.kind === 'expenditure').reduce((s, t) => s + t.amount, 0);
    const pendingExp = fin.filter((t) => t.kind === 'expenditure' && ['Submitted', 'Pending Approval'].includes(t.status)).length;
    const outstanding = invoices.filter((i) => ['Received', 'Under Review', 'Approved', 'Partially Paid'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
    const allocated = budgets.reduce((s, b) => s + b.allocated, 0);
    const util = allocated > 0 ? Math.round((spend / allocated) * 100) : 0;
    return { income, spend, balance: income - spend, pendingExp, outstanding, allocated, util };
  }, [fin, invoices, budgets]);

  const deptName = (id?: string) => departments.find((d) => d.id === id)?.name ?? 'General';
  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? '—';

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'income', label: 'Income', count: fin.filter((t) => t.kind === 'income').length },
    { id: 'expenditure', label: 'Expenditure', count: fin.filter((t) => t.kind === 'expenditure').length },
    { id: 'budget', label: 'Budget', count: budgets.length },
    { id: 'pettycash', label: 'Petty Cash' },
    { id: 'vendors', label: 'Vendors', count: vendors.length },
    { id: 'invoices', label: 'Invoices', count: invoices.length },
  ];

  return (
    <div>
      <PageHead kicker="Finance & bookkeeping" title="Institutional finance"
        sub={`Income, expenditure, budgets and procurement for ${org?.name ?? 'the organisation'} — every transaction traceable to an officer and an audit entry.`}>
        <span className="chip bg-pine-100 text-pine-700 !text-[12px]">Currency · {org?.currency?.code} ({org?.currency?.symbol})</span>
      </PageHead>

      <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Tab)} />

      <div className="mt-4">
        {tab === 'overview' && <Overview stats={stats} fin={fin} budgets={budgets} budgetSpent={budgetSpent} fmtMoney={fmtMoney} deptName={deptName} />}
        {tab === 'income' && <TxnTable kind="income" rows={fin.filter((t) => t.kind === 'income')} fmtMoney={fmtMoney} deptName={deptName} userName={userName} />}
        {tab === 'expenditure' && <TxnTable kind="expenditure" rows={fin.filter((t) => t.kind === 'expenditure')} fmtMoney={fmtMoney} deptName={deptName} userName={userName} />}
        {tab === 'budget' && <BudgetTab budgets={budgets} budgetSpent={budgetSpent} fmtMoney={fmtMoney} deptName={deptName} />}
        {tab === 'pettycash' && <PettyCash balance={pettyCashBalance()} fin={fin.filter((t) => t.category === 'Petty Cash')} fmtMoney={fmtMoney} userName={userName} />}
        {tab === 'vendors' && <VendorsTab vendors={vendors} invoices={invoices} fmtMoney={fmtMoney} />}
        {tab === 'invoices' && <InvoicesTab invoices={invoices} vendors={vendors} fmtMoney={fmtMoney} />}
      </div>
    </div>
  );
}

/* ── overview ── */
function Overview({ stats, fin, budgets, budgetSpent, fmtMoney, deptName }: {
  stats: { income: number; spend: number; balance: number; pendingExp: number; outstanding: number; allocated: number; util: number };
  fin: FinanceTxn[]; budgets: { id: string; category: string; allocated: number }[];
  budgetSpent: (id: string) => number; fmtMoney: (n: number) => string; deptName: (id?: string) => string;
}) {
  const { db, me } = useStore();
  const months = lastNMonthKeys(6);
  const series = months.map((mk) => ({
    label: monthLabel(mk),
    income: fin.filter((t) => t.kind === 'income' && monthKey(t.date) === mk && t.status === 'Paid').reduce((s, t) => s + t.amount, 0),
    spend: fin.filter((t) => t.kind === 'expenditure' && monthKey(t.date) === mk && !['Rejected', 'Cancelled', 'Draft'].includes(t.status)).reduce((s, t) => s + t.amount, 0),
  }));
  const max = Math.max(1, ...series.flatMap((s) => [s.income, s.spend]));
  const deptSpend = (db.departments.filter((d) => d.orgId === me?.orgId))
    .map((d) => ({ label: d.name, value: fin.filter((t) => t.kind === 'expenditure' && t.departmentId === d.id && !['Rejected', 'Cancelled', 'Draft'].includes(t.status)).reduce((s, t) => s + t.amount, 0) }))
    .filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const maxDept = Math.max(1, ...deptSpend.map((d) => d.value));
  const recent = [...fin].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 stagger">
          <Stat label="Income" value={stats.income} tone="pine" sub="recognised" />
          <Stat label="Expenditure" value={stats.spend} tone="clay" sub="committed & paid" />
          <Stat label="Balance" value={stats.balance} tone={stats.balance >= 0 ? 'pine' : 'clay'} sub="income − spend" />
          <Stat label="Pending expenses" value={stats.pendingExp} tone="brass" sub="awaiting approval" />
          <Stat label="Outstanding" value={stats.outstanding} tone="steel" sub="unpaid invoices" />
          <Stat label="Budget utilised" value={stats.util} tone={stats.util > 90 ? 'clay' : stats.util > 70 ? 'brass' : 'pine'} sub={`of ${fmtMoney(stats.allocated)}`} />
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal className="card p-4">
          <ChartTitle t="Income vs expenditure" s="Paid income against committed spend · last 6 months" />
          <div className="flex items-end gap-3 h-44">
            {series.map((s) => (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 flex-1">
                  <div className="w-1/3 max-w-[26px] bg-pine-600 rounded-t-sm group relative transition-all duration-500" style={{ height: `${(s.income / max) * 100}%`, minHeight: s.income ? 4 : 1 }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9.5px] ref text-pine-700 opacity-0 group-hover:opacity-100 whitespace-nowrap">{fmtMoney(s.income)}</span>
                  </div>
                  <div className="w-1/3 max-w-[26px] bg-clay-500 rounded-t-sm group relative transition-all duration-500" style={{ height: `${(s.spend / max) * 100}%`, minHeight: s.spend ? 4 : 1 }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9.5px] ref text-clay-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">{fmtMoney(s.spend)}</span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-ink-faint">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-pine-600" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-clay-500" /> Expenditure</span>
          </div>
        </Reveal>

        <Reveal delay={50} className="card p-4">
          <ChartTitle t="Expenditure by department" s="Where the budget is deployed" />
          {deptSpend.length === 0 ? <p className="text-[12.5px] text-ink-faint py-8 text-center">No departmental spend recorded yet.</p> : (
            <div className="space-y-2.5">
              {deptSpend.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-[11.5px] mb-0.5">
                    <span className="text-ink-soft">{d.label}</span><span className="ref font-semibold text-ink">{fmtMoney(d.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                    <div className="h-full rounded-full bg-brass-500 transition-all duration-700" style={{ width: `${(d.value / maxDept) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal className="card p-4">
          <ChartTitle t="Budget vs actual" s="Utilisation by budget line" />
          <div className="space-y-3">
            {budgets.slice(0, 5).map((b) => {
              const spent = budgetSpent(b.id);
              const pct = b.allocated > 0 ? Math.min(100, Math.round((spent / b.allocated) * 100)) : 0;
              const tone = pct >= 90 ? 'bg-clay-500' : pct >= 70 ? 'bg-brass-500' : 'bg-pine-600';
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-[11.5px] mb-0.5">
                    <span className="text-ink-soft">{b.category}</span>
                    <span className="ref text-ink"><span className="font-semibold">{fmtMoney(spent)}</span> / {fmtMoney(b.allocated)} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                    <div className={cx('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {budgets.length === 0 && <p className="text-[12.5px] text-ink-faint py-4 text-center">No budget lines configured.</p>}
          </div>
        </Reveal>

        <Reveal delay={50} className="card overflow-hidden">
          <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft"><h3 className="font-display font-bold text-[14.5px] text-ink">Recent transactions</h3></header>
          <div className="divide-y divide-line-soft">
            {recent.length === 0 && <p className="px-4 py-6 text-[13px] text-ink-faint text-center">No transactions yet.</p>}
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cx('w-1.5 h-8 rounded-full shrink-0', t.kind === 'income' ? 'bg-pine-500' : 'bg-clay-500')} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink truncate">{t.description}</p>
                  <p className="text-[10.5px] text-ink-faint">{t.party} · {fmtDate(t.date)} · {t.ref}</p>
                </div>
                <span className={cx('ref font-bold', t.kind === 'income' ? 'text-pine-700' : 'text-clay-600')}>{t.kind === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function ChartTitle({ t, s }: { t: string; s: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="text-pine-600 mt-0.5"><IcChart size={15} /></span>
      <div><h3 className="font-display font-bold text-[14.5px] text-ink leading-tight">{t}</h3><p className="text-[11px] text-ink-faint">{s}</p></div>
    </div>
  );
}

/* ── income / expenditure table ── */
function TxnTable({ kind, rows, fmtMoney, deptName, userName }: {
  kind: 'income' | 'expenditure'; rows: FinanceTxn[]; fmtMoney: (n: number) => string;
  deptName: (id?: string) => string; userName: (id?: string) => string;
}) {
  const { canUser, addFinanceTxn, setFinanceStatus, departments, db, me } = useStore();
  const budgets = useMemo(() => db.budgets.filter((b) => b.orgId === me?.orgId), [db.budgets, me]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const can = canUser('finance');
  const canApprove = canUser('approve');

  const list = rows.filter((t) => (!status || t.status === status) && (!q || [t.party, t.description, t.ref, t.category].some((s) => s.toLowerCase().includes(q.toLowerCase()))));

  return (
    <div>
      <div className="card p-3 mb-3 flex flex-wrap items-center gap-2">
        <input className="input !w-auto flex-1 min-w-[180px]" placeholder={`Search ${kind}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{EXP_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {can && <button className="btn-primary ml-auto" onClick={() => setOpen(true)}><IcPlus size={14} /> Record {kind}</button>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr>
            <th className="th">Ref</th><th className="th">Date</th><th className="th">{kind === 'income' ? 'Source' : 'Payee'}</th>
            <th className="th">Description</th><th className="th">Department</th><th className="th">Category</th>
            <th className="th text-right">Amount</th><th className="th">Status</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="td text-center text-ink-faint py-8">No {kind} records match.</td></tr>}
            {list.map((t) => (
              <tr key={t.id} className="tr-hover">
                <td className="td ref text-pine-700 whitespace-nowrap">{t.ref}</td>
                <td className="td whitespace-nowrap text-ink-soft">{fmtDate(t.date)}</td>
                <td className="td font-medium text-ink">{t.party}</td>
                <td className="td text-ink-soft min-w-[180px]">{t.description}</td>
                <td className="td text-ink-soft whitespace-nowrap">{deptName(t.departmentId)}</td>
                <td className="td text-ink-soft whitespace-nowrap">{t.category}</td>
                <td className={cx('td ref text-right font-bold whitespace-nowrap', t.kind === 'income' ? 'text-pine-700' : 'text-clay-600')}>{fmtMoney(t.amount)}</td>
                <td className="td"><Chip meta={{ label: t.status, chip: EXP_META[t.status].chip, dot: EXP_META[t.status].dot }} /></td>
                <td className="td whitespace-nowrap">
                  {canApprove && ['Submitted', 'Pending Approval'].includes(t.status) && (
                    <span className="flex gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => setFinanceStatus(t.id, 'Approved')}>Approve</button>
                      <button className="btn-ghost btn-sm !text-clay-600" onClick={() => setFinanceStatus(t.id, 'Rejected')}>Reject</button>
                    </span>
                  )}
                  {can && t.status === 'Approved' && <button className="btn-ghost btn-sm" onClick={() => setFinanceStatus(t.id, 'Paid')}>Mark paid</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <TxnModal kind={kind} departments={departments} budgets={budgets} onClose={() => setOpen(false)} onSave={(inp) => { addFinanceTxn({ ...inp, kind }); setOpen(false); }} />}
    </div>
  );
}

function TxnModal({ kind, departments, budgets, onClose, onSave }: {
  kind: 'income' | 'expenditure'; departments: { id: string; name: string }[]; budgets: { id: string; category: string }[];
  onClose: () => void; onSave: (i: { party: string; description: string; amount: number; category: string; departmentId?: string; budgetId?: string; date: string }) => void;
}) {
  const [party, setParty] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(kind === 'income' ? 'Grant' : 'Office Supplies');
  const [dept, setDept] = useState('');
  const [budget, setBudget] = useState('');
  const [date, setDate] = useState(dateOnly(0));
  const incomeCats = ['Grant', 'Donation', 'Service income', 'Tuition', 'Membership', 'Government allocation', 'Project funding', 'Petty Cash', 'Other'];
  const expCats = ['Office Supplies', 'Travel & Logistics', 'Events & Venues', 'Communications', 'Equipment & ICT', 'Training', 'Professional Fees', 'Petty Cash', 'Other'];
  const valid = party.trim() && desc.trim() && Number(amount) > 0;
  return (
    <Modal open onClose={onClose} title={kind === 'income' ? 'Record income' : 'Record expenditure'} subtitle="Creates an audited financial entry routed through the approval workflow" w="max-w-lg"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!valid} onClick={() => onSave({ party: party.trim(), description: desc.trim(), amount: Number(amount), category, departmentId: dept || undefined, budgetId: budget || undefined, date })}>Save {kind}</button></>}>
      <div className="space-y-3">
        <Field label={kind === 'income' ? 'Source' : 'Payee'} req><input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder={kind === 'income' ? 'e.g. Ford Foundation' : 'e.g. Meridian Supplies Ltd'} /></Field>
        <Field label="Description" req><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this for?" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" req><input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
          <Field label="Date" req><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{(kind === 'income' ? incomeCats : expCats).map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Department"><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">General</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        </div>
        {kind === 'expenditure' && (
          <Field label="Budget line" hint="Links this spend to a budget for utilisation tracking.">
            <select className="input" value={budget} onChange={(e) => setBudget(e.target.value)}><option value="">None</option>{budgets.map((b) => <option key={b.id} value={b.id}>{b.category}</option>)}</select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ── budget ── */
function BudgetTab({ budgets, budgetSpent, fmtMoney, deptName }: {
  budgets: { id: string; year: number; category: string; allocated: number; departmentId?: string }[];
  budgetSpent: (id: string) => number; fmtMoney: (n: number) => string; deptName: (id?: string) => string;
}) {
  const { canUser, addBudgetLine, org } = useStore();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('');
  const [amt, setAmt] = useState('');
  return (
    <div>
      <div className="flex justify-end mb-3">{canUser('finance') && <button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={14} /> Add budget line</button>}</div>
      <div className="grid md:grid-cols-2 gap-3.5 stagger">
        {budgets.length === 0 && <div className="card md:col-span-2"><EmptyState icon={<IcColumns size={20} />} title="No budget lines" body="Add annual or project budget lines to track utilisation and get alerts at 70/80/90/100%." /></div>}
        {budgets.map((b) => {
          const spent = budgetSpent(b.id);
          const remaining = b.allocated - spent;
          const pct = b.allocated > 0 ? Math.min(100, Math.round((spent / b.allocated) * 100)) : 0;
          const tone = pct >= 90 ? 'bg-clay-500' : pct >= 70 ? 'bg-brass-500' : 'bg-pine-600';
          const alert = (org?.budgetAlertPct ?? []).find((th) => pct >= th);
          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div><p className="font-display font-bold text-[15px] text-ink">{b.category}</p><p className="text-[11px] text-ink-faint">{deptName(b.departmentId)} · FY {b.year}</p></div>
                {alert !== undefined && <span className={cx('chip', pct >= 90 ? 'bg-clay-100 text-clay-700' : 'bg-brass-100 text-brass-700')}>{pct}% utilised</span>}
              </div>
              <div className="h-2.5 rounded-full bg-line-soft overflow-hidden mt-3">
                <div className={cx('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[11.5px]">
                <span className="text-ink-soft">Spent <span className="ref font-bold text-ink">{fmtMoney(spent)}</span></span>
                <span className={cx('ref font-bold', remaining < 0 ? 'text-clay-600' : 'text-pine-700')}>{fmtMoney(remaining)} left</span>
              </div>
              <p className="text-[10.5px] text-ink-faint mt-1">Budget {fmtMoney(b.allocated)}</p>
            </div>
          );
        })}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add budget line" w="max-w-md"
          footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!cat.trim() || Number(amt) <= 0} onClick={() => { addBudgetLine({ year: new Date().getFullYear(), category: cat.trim(), allocated: Number(amt) }); setOpen(false); setCat(''); setAmt(''); }}>Add line</button></>}>
          <div className="space-y-3">
            <Field label="Budget category" req><input className="input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="e.g. Programme Delivery" /></Field>
            <Field label="Allocated amount" req><input className="input" type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── petty cash ── */
function PettyCash({ balance, fin, fmtMoney, userName }: { balance: number; fin: FinanceTxn[]; fmtMoney: (n: number) => string; userName: (id?: string) => string }) {
  const { org } = useStore();
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5 bg-pine-900 border-pine-800 sidebar-texture">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brass-400">Petty cash balance</p>
        <p className="font-display font-extrabold text-[32px] text-paper mt-1.5 leading-none">{fmtMoney(balance)}</p>
        <p className="text-[11.5px] text-pine-300 mt-2">Opening {fmtMoney(org?.pettyCashOpening ?? 0)} · {fin.length} movement{fin.length === 1 ? '' : 's'}</p>
        {balance < (org?.pettyCashOpening ?? 0) * 0.2 && <p className="chip bg-clay-100 text-clay-700 mt-3">Low balance — consider replenishment</p>}
      </div>
      <div className="lg:col-span-2 card overflow-hidden">
        <header className="px-4 pt-3.5 pb-2.5 border-b border-line-soft"><h3 className="font-display font-bold text-[14.5px] text-ink">Petty cash movements</h3></header>
        <div className="divide-y divide-line-soft">
          {fin.length === 0 && <p className="px-4 py-6 text-[13px] text-ink-faint text-center">No petty cash movements yet. Record income/expenditure with category “Petty Cash”.</p>}
          {fin.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cx('w-1.5 h-8 rounded-full', t.kind === 'income' ? 'bg-pine-500' : 'bg-clay-500')} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-ink truncate">{t.description}</p>
                <p className="text-[10.5px] text-ink-faint">{fmtDate(t.date)} · {userName(t.kind === 'income' ? t.paidById : t.requestedById)} · {t.status}</p>
              </div>
              <span className={cx('ref font-bold', t.kind === 'income' ? 'text-pine-700' : 'text-clay-600')}>{t.kind === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── vendors ── */
function VendorsTab({ vendors, invoices, fmtMoney }: { vendors: { id: string; name: string; category: string; contactPerson?: string; email?: string; phone?: string; status: string; notes?: string }[]; invoices: { vendorId?: string; amount: number; status: string }[]; fmtMoney: (n: number) => string }) {
  const { canUser, addVendor } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [cat, setCat] = useState(''); const [contact, setContact] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const spendFor = (id: string) => invoices.filter((i) => i.vendorId === id && i.status !== 'Cancelled').reduce((s, i) => s + i.amount, 0);
  return (
    <div>
      <div className="flex justify-end mb-3">{canUser('finance') && <button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={14} /> Add vendor</button>}</div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
        {vendors.length === 0 && <div className="card md:col-span-3"><EmptyState icon={<IcUsers size={20} />} title="No vendors" body="Add suppliers and service providers to link invoices and track spend." /></div>}
        {vendors.map((v) => (
          <div key={v.id} className={cx('card p-4', v.status === 'Inactive' && 'opacity-60')}>
            <div className="flex items-start justify-between">
              <div><p className="font-display font-bold text-[15px] text-ink">{v.name}</p><p className="text-[11px] text-ink-faint">{v.category}</p></div>
              <Chip meta={{ label: v.status, chip: v.status === 'Active' ? 'bg-moss-100 text-moss-700' : 'bg-line-soft text-ink-faint', dot: v.status === 'Active' ? 'bg-moss-600' : 'bg-ink-faint' }} />
            </div>
            <div className="mt-2.5 space-y-0.5 text-[11.5px] text-ink-soft">
              {v.contactPerson && <p>{v.contactPerson}</p>}
              {v.email && <p className="ref">{v.email}</p>}
              {v.phone && <p className="ref">{v.phone}</p>}
            </div>
            {v.notes && <p className="text-[11px] text-ink-faint italic mt-2 leading-snug">“{v.notes}”</p>}
            <p className="text-[11px] text-ink-faint mt-2.5 pt-2 border-t border-line-soft">Lifetime spend <span className="ref font-bold text-ink">{fmtMoney(spendFor(v.id))}</span></p>
          </div>
        ))}
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add vendor" w="max-w-lg"
          footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!name.trim() || !cat.trim()} onClick={() => { addVendor({ name: name.trim(), category: cat.trim(), contactPerson: contact || undefined, email: email || undefined, phone: phone || undefined, status: 'Active' }); setOpen(false); setName(''); setCat(''); setContact(''); setEmail(''); setPhone(''); }}>Add vendor</button></>}>
          <div className="space-y-3">
            <Field label="Vendor name" req><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Category" req><input className="input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="e.g. ICT Equipment" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact person"><input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── invoices ── */
function InvoicesTab({ invoices, vendors, fmtMoney }: { invoices: { id: string; ref: string; vendorId?: string; date: string; dueDate?: string; amount: number; status: InvoiceStatus }[]; vendors: { id: string; name: string }[]; fmtMoney: (n: number) => string }) {
  const { canUser, addInvoice, setInvoiceStatus, org } = useStore();
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState(''); const [amt, setAmt] = useState(''); const [date, setDate] = useState(dateOnly(0)); const [due, setDue] = useState('');
  const vName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? '—';
  return (
    <div>
      <div className="flex justify-end mb-3">{canUser('finance') && <button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={14} /> Register invoice</button>}</div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="th">Ref</th><th className="th">Vendor</th><th className="th">Date</th><th className="th">Due</th><th className="th text-right">Amount</th><th className="th">Status</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={7} className="td text-center text-ink-faint py-8">No invoices registered.</td></tr>}
            {invoices.map((i) => (
              <tr key={i.id} className="tr-hover">
                <td className="td ref text-pine-700 whitespace-nowrap">{i.ref}</td>
                <td className="td font-medium text-ink">{vName(i.vendorId)}</td>
                <td className="td text-ink-soft whitespace-nowrap">{fmtDate(i.date)}</td>
                <td className="td text-ink-soft whitespace-nowrap">{i.dueDate ? fmtDate(i.dueDate) : '—'}</td>
                <td className="td ref text-right font-bold whitespace-nowrap">{fmtMoney(i.amount)}</td>
                <td className="td"><Chip meta={{ label: i.status, chip: INV_META[i.status].chip, dot: INV_META[i.status].dot }} /></td>
                <td className="td whitespace-nowrap">
                  {canUser('finance') && i.status !== 'Paid' && i.status !== 'Cancelled' && (
                    <span className="flex gap-1">
                      {i.status !== 'Approved' && <button className="btn-ghost btn-sm" onClick={() => setInvoiceStatus(i.id, 'Approved')}>Approve</button>}
                      <button className="btn-ghost btn-sm" onClick={() => setInvoiceStatus(i.id, 'Paid')}>Mark paid</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Register invoice" w="max-w-lg"
          footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!vendor || Number(amt) <= 0} onClick={() => { addInvoice({ vendorId: vendor, amount: Number(amt), date, dueDate: due || undefined, currency: org?.currency?.code ?? 'NGN', status: 'Received' }); setOpen(false); setVendor(''); setAmt(''); setDue(''); }}>Register</button></>}>
          <div className="space-y-3">
            <Field label="Vendor" req><select className="input" value={vendor} onChange={(e) => setVendor(e.target.value)}><option value="">Select vendor…</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount" req><input className="input" type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
              <Field label="Invoice date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
            <Field label="Due date"><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

void [IcFile, Seg, Avatar, Reveal];
