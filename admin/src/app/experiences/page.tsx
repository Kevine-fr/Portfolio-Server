'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Briefcase, MapPin } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { Experience } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ExperienceForm } from '@/components/forms/experience-form';

const fmtDate = (d?: string) =>
  d ? format(new Date(d), 'MMM yyyy', { locale: fr }) : '';

export default function ExperiencesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Experience | null>(null);
  const [toDelete, setToDelete] = useState<Experience | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['experiences'], queryFn: () => apiGet<Experience[]>('/experiences') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/experiences', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Expérience ajoutée'); setCreating(false); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/experiences/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Expérience modifiée'); setEditing(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/experiences/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Supprimée'); setToDelete(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  return (
    <>
      <PageHeader
        title="Expériences"
        description="Parcours professionnel affiché sur le portfolio."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle expérience</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucune expérience" description="Ajoutez votre première expérience professionnelle."
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle expérience</Button>} />
      ) : (
        <div className="space-y-3">
          {data.map((x) => (
            <Card key={x._id} className="group animate-fade-in">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{x.title}</h3>
                      {x.current && <Badge variant="success">En cours</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{x.company}</span>
                      {x.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {x.location}
                        </span>
                      )}
                      <span className="text-xs">
                        {fmtDate(x.startDate)} → {x.current ? 'aujourd\'hui' : fmtDate(x.endDate)}
                      </span>
                    </div>
                    {x.description && <p className="text-sm text-foreground/80">{x.description}</p>}
                    {x.achievements.length > 0 && (
                      <ul className="ml-5 list-disc text-sm text-foreground/70 space-y-0.5">
                        {x.achievements.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                    {x.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {x.techStack.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(x)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(x)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle expérience</DialogTitle>
            <DialogDescription>Ajoutez une expérience professionnelle.</DialogDescription>
          </DialogHeader>
          <ExperienceForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'expérience</DialogTitle>
            <DialogDescription>{editing?.title}</DialogDescription>
          </DialogHeader>
          {editing && (
            <ExperienceForm defaultValues={editing} submitting={updateMut.isPending}
              onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
              onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette expérience ?"
        description={toDelete ? `« ${toDelete.title} chez ${toDelete.company} » sera supprimée.` : ''}
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
