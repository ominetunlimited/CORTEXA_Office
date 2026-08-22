import React from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Shell } from './components/shell';
import { GlobalSearch } from './components/shell';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Correspondence } from './views/Correspondence';
import { Matters } from './views/Matters';
import { Documents } from './views/Documents';
import { Meetings } from './views/Meetings';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { ContactsView, DepartmentsView } from './views/People';
import { Reports } from './views/Reports';
import { ArchiveView } from './views/ArchiveView';
import { Admin } from './views/Admin';
import { SecretaryDesk, ExecutiveDesk } from './views/Desk';
import { FinanceView } from './views/Finance';
import { DeadlinesView, AnnouncementsView, AssetsView } from './views/Operations';
import { EmptyState, Chip } from './components/ui';
import { IcSearch, IcEnvelope, IcFile, IcSeal, IcUsers, IcCheckSquare, IcBook } from './components/icons';
import type { Route } from './lib/types';

function SearchView() {
  const { route, searchAll, nav } = useStore();
  const q = route.q ?? '';
  const res = searchAll(q);
  const total = res.correspondence.length + res.documents.length + res.matters.length + res.meetings.length + res.tasks.length + res.contacts.length;

  type Section = { label: string; icon: React.ReactNode; routeName: Route['name']; items: { id: string; title: string; sub: string; chip: React.ReactNode }[] };
  const allSections: Section[] = [
    { label: 'Correspondence', icon: <IcEnvelope size={14} />, routeName: 'correspondence', items: res.correspondence.map((c) => ({ id: c.id, title: c.subject, sub: `${c.ref} · ${c.direction} · ${c.senderOrg ?? c.recipientOrg ?? ''} · ${c.status}`, chip: <Chip meta={{ label: c.type, chip: 'bg-pine-100 text-pine-700', dot: 'bg-pine-500' }} /> })) },
    { label: 'Documents', icon: <IcFile size={14} />, routeName: 'documents', items: res.documents.map((d) => ({ id: d.id, title: d.title, sub: `${d.fileNumber} · ${d.category} · ${d.security}${d.ocr ? ' · OCR indexed' : ''}`, chip: <Chip meta={{ label: d.status, chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' }} /> })) },
    { label: 'Matters', icon: <IcSeal size={14} />, routeName: 'matter', items: res.matters.map((m) => ({ id: m.id, title: m.title, sub: `${m.fileNumber} · ${m.category} · ${m.status}`, chip: <Chip meta={{ label: m.status, chip: 'bg-moss-100 text-moss-700', dot: 'bg-moss-600' }} /> })) },
    { label: 'Meetings', icon: <IcUsers size={14} />, routeName: 'meeting', items: res.meetings.map((m) => ({ id: m.id, title: m.title, sub: `${m.date} · ${m.venue} · ${m.status}`, chip: <Chip meta={{ label: m.status, chip: 'bg-steel-100 text-steel-700', dot: 'bg-steel-500' }} /> })) },
    { label: 'Tasks', icon: <IcCheckSquare size={14} />, routeName: 'tasks', items: res.tasks.map((t) => ({ id: t.id, title: t.title, sub: `${t.ref} · ${t.status}`, chip: <Chip meta={{ label: t.status, chip: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' }} /> })) },
    { label: 'Contacts', icon: <IcBook size={14} />, routeName: 'contacts', items: res.contacts.map((c) => ({ id: c.id, title: c.name, sub: `${c.position} · ${c.organisation}`, chip: null })) },
  ];
  const sections = allSections.filter((s) => s.items.length > 0);

  return (
    <div className="max-w-4xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600 mb-1">Registry search</p>
      <h1 className="font-display font-extrabold text-[24px] text-ink tracking-tight mb-4">Search the institutional register</h1>
      <GlobalSearch autoFocus big />
      <p className="text-[12px] text-ink-faint mt-3">
        Searches reference numbers, subjects, senders, recipients, departments, staff, meeting venues, contact tags — and OCR-extracted scan text. Only records your role may see are returned.
      </p>

      {!q && (
        <div className="card mt-6">
          <EmptyState icon={<IcSearch size={20} />} title="Type to search"
            body="Try “Federal Ministry of Housing”, a reference like CFR/ADM, “invitation”, or scan text like “Transcorp Hilton”." />
        </div>
      )}
      {q && total === 0 && (
        <div className="card mt-6">
          <EmptyState icon={<IcSearch size={20} />} title={`No records match “${q}”`}
            body="Nothing visible to your role matches. Reference numbers, sender organisations and OCR text are all indexed — try a shorter keyword." />
        </div>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <section key={s.label}>
            <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint mb-2">
              <span className="text-pine-600">{s.icon}</span>{s.label}
              <span className="ref">({s.items.length})</span>
            </h2>
            <div className="card divide-y divide-line-soft overflow-hidden">
              {s.items.map((it) => (
                <button key={it.id} onClick={() => nav({ name: s.routeName, id: it.id })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pine-50/70 transition-colors cursor-pointer text-left">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink truncate">{it.title}</span>
                    <span className="block text-[11.5px] text-ink-faint truncate mt-0.5 ref">{it.sub}</span>
                  </span>
                  {it.chip}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Router() {
  const { me, route } = useStore();
  if (!me) return <Login />;

  let view: React.ReactNode;
  switch (route.name) {
    case 'desk-secretary': view = <SecretaryDesk />; break;
    case 'desk-executive': view = <ExecutiveDesk />; break;
    case 'correspondence': view = <Correspondence />; break;
    case 'matters': case 'matter': view = <Matters />; break;
    case 'documents': view = <Documents />; break;
    case 'meetings': case 'meeting': view = <Meetings />; break;
    case 'tasks': view = <TasksView />; break;
    case 'calendar': view = <CalendarView />; break;
    case 'contacts': view = <ContactsView />; break;
    case 'departments': view = <DepartmentsView />; break;
    case 'reports': view = <Reports />; break;
    case 'archive': view = <ArchiveView />; break;
    case 'admin': view = <Admin />; break;
    case 'search': view = <SearchView />; break;
    case 'finance': view = <FinanceView />; break;
    case 'deadlines': view = <DeadlinesView />; break;
    case 'announcements': view = <AnnouncementsView />; break;
    case 'assets': view = <AssetsView />; break;
    default: view = <Dashboard />;
  }

  return (
    <Shell>
      <div key={`${route.name}:${route.id ?? ''}:${route.q ?? ''}`} className="anim-fade">{view}</div>
    </Shell>
  );
}

/* last-line-of-defence boundary — the workspace must never render a blank
   page; users get a branded recovery screen with safe restart options.     */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Cortexa recovered from a render error:', error);
  }

  private hardReset = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('cortexa.'))
        .forEach((k) => localStorage.removeItem(k));
      if ('caches' in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
    } catch { /* storage unavailable */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen ledger-bg flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-7 anim-pop">
          <p className="font-display font-extrabold text-[20px] text-ink tracking-tight">The registry hit an unexpected snag</p>
          <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">
            Your institutional records are safe in this browser. Reloading usually resolves this;
            if it persists, a safe restart clears only the local application cache.
          </p>
          <p className="text-[11px] font-mono text-ink-faint mt-3 break-words">{this.state.error.message}</p>
          <div className="flex gap-2 mt-5">
            <button className="btn-primary flex-1" onClick={() => window.location.reload()}>Reload workspace</button>
            <button className="btn-ghost flex-1" onClick={this.hardReset}>Safe restart</button>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Router />
      </StoreProvider>
    </ErrorBoundary>
  );
}
