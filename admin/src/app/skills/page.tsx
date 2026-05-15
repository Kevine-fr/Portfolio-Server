'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, X, Sparkles, EyeOff } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { Skill, SkillCategory } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SkillForm } from '@/components/forms/skill-form';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: 'Frontend', backend: 'Backend', tools: 'Outils', design: 'Design', other: 'Autre',
};

export default function SkillsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Skill | null>(null);
  const [toDelete, setToDelete] = useState<Skill | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['skills'], queryFn: () => apiGet<Skill[]>('/skills') });

  const grouped = useMemo(() => {
    const g: Record<SkillCategory, Skill[]> = { frontend: [], backend: [], tools: [], design: [], other: [] };
    (data ?? []).forEach((s) => g[s.category]?.push(s));
    return g;
  }, [data]);

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/skills', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Compétence ajoutée'); setCreating(false); },
    onError:    (err) => toast.error('Échec de la création', { description: getErrorMessage(err) }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/skills/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Compétence modifiée'); setEditing(null); },
    onError:    (err) => toast.error('Échec de la modification', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/skills/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Compétence supprimée'); setToDelete(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  return (
    <>
      <PageHeader
        title="Compétences"
        description="Organisez vos compétences par catégorie."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle compétence</Button>}
      />

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aucune compétence"
          description="Ajoutez des compétences pour les afficher dans la constellation du portfolio."
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvelle compétence</Button>}
        />
      ) : (
        <div className="space-y-4">
          {(Object.keys(grouped) as SkillCategory[]).map((cat) =>
            grouped[cat].length === 0 ? null : (
              <Card key={cat} className="animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base font-semibold">{CATEGORY_LABELS[cat]}</CardTitle>
                  <Badge variant="secondary">{grouped[cat].length}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {grouped[cat].map((s) => (
                      <div key={s._id} className="group flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/40">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{s.name}</span>
                            {!s.visible && <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full bg-primary transition-all" style={{ width: `${s.level}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{s.level}%</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(s)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setToDelete(s)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle compétence</DialogTitle>
            <DialogDescription>Ajoutez une nouvelle compétence.</DialogDescription>
          </DialogHeader>
          <SkillForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la compétence</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <SkillForm defaultValues={editing} submitting={updateMut.isPending}
              onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
              onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette compétence ?"
        description={toDelete ? `« ${toDelete.name} » sera retirée du portfolio.` : ''}
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
