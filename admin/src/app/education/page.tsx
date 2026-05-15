'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Pencil, Trash2, GraduationCap, MapPin } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { Education } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EducationForm } from '@/components/forms/education-form';

const fmtDate = (d?: string) => d ? format(new Date(d), 'MMM yyyy', { locale: fr }) : 'présent';

export default function EducationPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Education | null>(null);
  const [toDelete, setToDelete] = useState<Education | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['education'], queryFn: () => apiGet<Education[]>('/education') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/education', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Formation ajoutée'); setCreating(false); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/education/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Formation modifiée'); setEditing(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/education/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Supprimée'); setToDelete(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  return (
    <>
      <PageHeader title="Formation" description="Parcours académique."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle formation</Button>} />

      {isLoading ? (
        <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aucune formation"
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle formation</Button>} />
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <Card key={e._id} className="group animate-fade-in">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="font-semibold">{e.degree}{e.field ? ` · ${e.field}` : ''}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{e.school}</span>
                      {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                      <span className="text-xs">{fmtDate(e.startDate)} → {fmtDate(e.endDate)}</span>
                    </div>
                    {e.description && <p className="text-sm text-foreground/80">{e.description}</p>}
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle formation</DialogTitle>
            <DialogDescription>Ajoutez une formation à votre parcours.</DialogDescription>
          </DialogHeader>
          <EducationForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la formation</DialogTitle>
            <DialogDescription>{editing?.degree}</DialogDescription>
          </DialogHeader>
          {editing && (
            <EducationForm defaultValues={editing} submitting={updateMut.isPending}
              onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
              onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette formation ?"
        description={toDelete ? `« ${toDelete.degree} » sera supprimée.` : ''}
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
