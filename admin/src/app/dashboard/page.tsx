'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FolderKanban, Sparkles, Briefcase, Inbox, ArrowRight, Mail,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Project, Skill, Experience, Contact } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const projects = useQuery({ queryKey: ['projects'],    queryFn: () => apiGet<Project[]>('/projects') });
  const skills   = useQuery({ queryKey: ['skills'],      queryFn: () => apiGet<Skill[]>('/skills') });
  const exps     = useQuery({ queryKey: ['experiences'], queryFn: () => apiGet<Experience[]>('/experiences') });
  const contacts = useQuery({ queryKey: ['contacts'],    queryFn: () => apiGet<Contact[]>('/contacts') });

  const stats = [
    {
      label: 'Projets',
      value: projects.data?.length ?? 0,
      detail: `${projects.data?.filter((p) => p.status === 'published').length ?? 0} publiés`,
      icon: FolderKanban,
      href: '/projects',
      loading: projects.isLoading,
    },
    {
      label: 'Compétences',
      value: skills.data?.length ?? 0,
      detail: `${skills.data?.filter((s) => s.visible).length ?? 0} visibles`,
      icon: Sparkles,
      href: '/skills',
      loading: skills.isLoading,
    },
    {
      label: 'Expériences',
      value: exps.data?.length ?? 0,
      detail: `${exps.data?.filter((e) => e.current).length ?? 0} en cours`,
      icon: Briefcase,
      href: '/experiences',
      loading: exps.isLoading,
    },
    {
      label: 'Messages',
      value: contacts.data?.length ?? 0,
      detail: `${contacts.data?.filter((c) => !c.read && !c.archived).length ?? 0} non lus`,
      icon: Inbox,
      href: '/contacts',
      loading: contacts.isLoading,
    },
  ];

  const recentContacts = (contacts.data ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du portfolio en temps réel."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group" style={{ animation: `fade-in 0.4s ease-out ${i * 80}ms backwards` }}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {s.loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{s.value}</div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent contacts */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Messages récents</CardTitle>
            <CardDescription>Les derniers messages reçus via le formulaire de contact.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contacts">
              Tout voir <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recentContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mail className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun message reçu pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentContacts.map((c) => (
                <Link
                  key={c._id}
                  href="/contacts"
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-accent/40 -mx-2 px-2 rounded-md"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${c.read ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.subject || c.message.slice(0, 60)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!c.read && <Badge variant="default" className="text-[10px]">Nouveau</Badge>}
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {format(new Date(c.createdAt), 'd MMM', { locale: fr })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
