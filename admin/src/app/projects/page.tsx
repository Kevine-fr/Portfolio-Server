'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Star, Pencil, Trash2, FolderKanban } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { Project } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProjectForm } from '@/components/forms/project-form';

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' | 'success' =>
  s === 'published' ? 'success' : s === 'draft' ? 'secondary' : 'outline';
const statusLabel = (s: string) =>
  s === 'published' ? 'Publié' : s === 'draft' ? 'Brouillon' : 'Archivé';

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn:  () => apiGet<Project[]>('/projects'),
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => apiPost('/projects', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Projet créé'); setCreating(false); },
    onError:    (err) => toast.error('Échec de la création', { description: getErrorMessage(err) }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/projects/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Projet modifié'); setEditing(null); },
    onError:    (err) => toast.error('Échec de la modification', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/projects/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Projet supprimé'); setToDelete(null); },
    onError:    (err) => toast.error('Échec de la suppression', { description: getErrorMessage(err) }),
  });

  return (
    <>
      <PageHeader
        title="Projets"
        description="Gérez les projets affichés dans votre portfolio."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouveau projet
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet"
          description="Créez votre premier projet pour qu'il apparaisse sur le portfolio."
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouveau projet</Button>}
        />
      ) : (
        <>
          {/* ─── Mobile : cards stack ─────────────────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {data.map((p) => (
              <Card key={p._id} className="p-4 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {p.featured && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />}
                      <h3 className="font-medium truncate">{p.title}</h3>
                    </div>
                    {p.subtitle && <p className="text-xs text-muted-foreground truncate">{p.subtitle}</p>}
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{p.slug}</p>
                  </div>
                  <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.year ?? '—'}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* ─── Desktop : table ──────────────────────────────────────────── */}
          <Card className="hidden md:block animate-fade-in">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-16">Année</TableHead>
                  <TableHead className="w-16 text-right">Ordre</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.featured && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                        <div>
                          <p className="font-medium">{p.title}</p>
                          {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.slug}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                    </TableCell>
                    <TableCell>{p.year ?? '—'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Ajoutez un projet à votre portfolio.</DialogDescription>
          </DialogHeader>
          <ProjectForm
            submitting={createMut.isPending}
            onSubmit={(p) => createMut.mutateAsync(p)}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>{editing?.title}</DialogDescription>
          </DialogHeader>
          {editing && (
            <ProjectForm
              defaultValues={editing}
              submitting={updateMut.isPending}
              onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce projet ?"
        description={toDelete ? `« ${toDelete.title} » sera supprimé définitivement.` : ''}
        confirmLabel="Supprimer"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
