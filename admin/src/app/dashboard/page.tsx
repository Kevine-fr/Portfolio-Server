'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { Project, Skill, Experience, Contact } from '@/types';

export default function DashboardPage() {
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => apiGet<Project[]>('/projects') });
  const skills   = useQuery({ queryKey: ['skills'],   queryFn: () => apiGet<Skill[]>('/skills') });
  const exps     = useQuery({ queryKey: ['experiences'], queryFn: () => apiGet<Experience[]>('/experiences') });
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: () => apiGet<Contact[]>('/contacts') });

  const stats = [
    { label: 'PROJECTS',    value: projects.data?.length ?? 0, sub: `${projects.data?.filter((p) => p.status === 'published').length ?? 0} published`, prompt: '01' },
    { label: 'SKILLS',      value: skills.data?.length ?? 0,   sub: `${skills.data?.filter((s) => s.visible).length ?? 0} visible`,                  prompt: '02' },
    { label: 'EXPERIENCES', value: exps.data?.length ?? 0,     sub: `${exps.data?.filter((e) => e.current).length ?? 0} current`,                    prompt: '03' },
    { label: 'CONTACTS',    value: contacts.data?.length ?? 0, sub: `${contacts.data?.filter((c) => !c.read).length ?? 0} unread`,                   prompt: '06' },
  ];

  const recentContacts = contacts.data?.slice(0, 5) ?? [];
  const isLoading = projects.isLoading || skills.isLoading || exps.isLoading || contacts.isLoading;

  if (isLoading) return <Loader label="Loading constellation data..." />;

  return (
    <>
      <PageHeader
        prompt="dashboard.overview"
        title="Welcome back ✦"
        subtitle="Live snapshot of the portfolio constellation. All systems nominal."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="card-gold p-5 hover:shadow-gold transition-shadow">
            <p className="console-label mb-2">{`> ${s.prompt}`}</p>
            <p className="text-3xl font-bold text-goldGlow font-mono mb-1">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted mb-2">{s.label}</p>
            <p className="text-xs text-goldPale/70 font-mono">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-gold p-6">
          <p className="console-label mb-4">{`> recent.contacts`}</p>
          {recentContacts.length === 0 ? (
            <p className="text-muted text-sm font-mono py-8 text-center">No messages received yet.</p>
          ) : (
            <table className="table-gold">
              <thead>
                <tr><th>From</th><th>Subject</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentContacts.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <p className="text-whiteHex font-mono text-sm">{c.name}</p>
                      <p className="text-muted text-xs">{c.email}</p>
                    </td>
                    <td className="text-whiteHex/80 max-w-xs truncate">{c.subject || '—'}</td>
                    <td>
                      {c.read
                        ? <span className="badge badge-muted">read</span>
                        : <span className="badge badge-gold">new</span>}
                    </td>
                    <td className="text-muted text-xs font-mono">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card-gold p-6">
          <p className="console-label mb-4">{`> sys.info`}</p>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-goldDeep/10 pb-2">
              <dt className="text-muted">VERSION</dt>
              <dd className="text-goldPale">v1.0.0</dd>
            </div>
            <div className="flex justify-between border-b border-goldDeep/10 pb-2">
              <dt className="text-muted">ENV</dt>
              <dd className="text-goldPale">{process.env.NODE_ENV}</dd>
            </div>
            <div className="flex justify-between border-b border-goldDeep/10 pb-2">
              <dt className="text-muted">API</dt>
              <dd className="text-success">● online</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">UPTIME</dt>
              <dd className="text-goldPale">∞</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
