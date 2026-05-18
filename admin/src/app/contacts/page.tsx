'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive, ArchiveRestore, Trash2, Reply, Inbox } from 'lucide-react';
import { apiGet, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { Contact } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Filter = 'all' | 'unread' | 'archived';

export default function ContactsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Contact | null>(null);
  const [toDelete, setToDelete] = useState<Contact | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => apiGet<Contact[]>('/contacts') });

  const filtered = (data ?? []).filter((c) => {
    if (filter === 'unread')   return !c.read && !c.archived;
    if (filter === 'archived') return c.archived;
    return !c.archived;
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/contacts/${id}`, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/contacts/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Message supprimé');
      setToDelete(null); setOpen(null);
    },
    onError: (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  const openContact = (c: Contact) => {
    setOpen(c);
    if (!c.read) updateMut.mutate({ id: c._id, payload: { read: true } });
  };

  const toggleArchive = (c: Contact) => {
    updateMut.mutate(
      { id: c._id, payload: { archived: !c.archived } },
      { onSuccess: () => { toast.success(c.archived ? 'Désarchivé' : 'Archivé'); setOpen(null); } },
    );
  };

  const filterButtons: { value: Filter; label: string }[] = [
    { value: 'all',      label: 'Tous' },
    { value: 'unread',   label: 'Non lus' },
    { value: 'archived', label: 'Archivés' },
  ];

  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages reçus via le formulaire de contact."
        actions={
          <div className="inline-flex flex-wrap gap-1 rounded-md border p-1">
            {filterButtons.map((b) => (
              <Button
                key={b.value}
                size="sm"
                variant={filter === b.value ? 'secondary' : 'ghost'}
                onClick={() => setFilter(b.value)}
              >
                {b.label}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`Aucun message ${filter === 'archived' ? 'archivé' : filter === 'unread' ? 'non lu' : ''}`}
          description="Les nouveaux messages apparaîtront ici."
        />
      ) : (
        <Card className="animate-fade-in">
          <div className="divide-y">
            {filtered.map((c) => (
              <button
                key={c._id}
                onClick={() => openContact(c)}
                className={`w-full flex items-start gap-3 p-3 sm:p-4 text-left transition-colors hover:bg-accent/40 ${!c.read ? 'bg-accent/20' : ''}`}
              >
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!c.read ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${!c.read ? 'font-semibold' : 'font-medium'}`}>{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.archived && <Badge variant="secondary" className="text-[10px]">Archivé</Badge>}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.createdAt), 'd MMM', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <p className={`mt-1 text-sm line-clamp-2 ${!c.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {c.subject || c.message.slice(0, 100) + (c.message.length > 100 ? '…' : '')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Message dialog — fully responsive */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          className="
            w-[calc(100vw-1rem)] max-w-2xl
            max-h-[calc(100dvh-1rem)] sm:max-h-[85vh]
            p-0 gap-0
            flex flex-col overflow-hidden
          "
        >
          {open && (
            <>
              {/* HEADER — fixe en haut */}
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
                <DialogTitle className="break-words pr-6 text-base sm:text-lg leading-tight">
                  {open.subject || 'Sans objet'}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-col gap-1.5 pt-2 sm:flex-row sm:items-start sm:justify-between text-sm">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{open.name}</p>
                      <a
                        href={`mailto:${open.email}`}
                        className="text-primary hover:underline text-xs sm:text-sm break-all"
                      >
                        {open.email}
                      </a>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted-foreground sm:text-right">
                      {format(new Date(open.createdAt), 'PPP', { locale: fr })}
                      <br className="hidden sm:inline" />
                      <span className="sm:hidden"> · </span>
                      {format(new Date(open.createdAt), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              {/* CORPS scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                <div className="rounded-md border bg-muted/40 p-3 sm:p-4">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {open.message}
                  </p>
                </div>

                {(open.ip || open.userAgent) && (
                  <div className="space-y-1 text-[11px] sm:text-xs text-muted-foreground font-mono break-all">
                    {open.ip && <p>IP : {open.ip}</p>}
                    {open.userAgent && <p className="break-all">UA : {open.userAgent}</p>}
                  </div>
                )}
              </div>

              {/* FOOTER actions — fixe en bas */}
              <div className="border-t bg-background p-3 sm:p-4 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 items-center">
                  <Button
                    variant="destructive"
                    onClick={() => setToDelete(open)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-1.5">Supprimer</span>
                  </Button>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => toggleArchive(open)}
                      size="sm"
                    >
                      {open.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      <span className="ml-1.5">{open.archived ? 'Désarchiver' : 'Archiver'}</span>
                    </Button>
                    <Button asChild size="sm">
                      <a href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject || '')}`}>
                        <Reply className="h-4 w-4" />
                        <span className="ml-1.5">Répondre</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce message ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
