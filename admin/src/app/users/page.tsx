'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users as UsersIcon, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDel, getErrorMessage } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserForm } from '@/components/forms/user-form';

export default function UsersPage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<User[]>('/users'),
    enabled: me?.role === 'admin',
  });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/users', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur créé'); setCreating(false); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/users/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur modifié'); setEditing(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/users/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Supprimé'); setToDelete(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  if (me?.role !== 'admin') {
    return (
      <>
        <PageHeader title="Utilisateurs" />
        <EmptyState
          icon={ShieldAlert}
          title="Accès réservé"
          description="Vous devez être administrateur pour gérer les utilisateurs."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes administrateurs et éditeurs."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvel utilisateur</Button>}
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <EmptyState icon={ShieldAlert} title="Impossible de charger les utilisateurs" description="Vérifiez vos permissions." />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Aucun utilisateur" action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouvel utilisateur</Button>} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.map((u) => (
              <Card key={u._id} className="p-4 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{u.name}</p>
                      {u._id === me?.id && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" disabled={u._id === me?.id} onClick={() => setToDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role === 'admin' ? 'Administrateur' : 'Éditeur'}
                  </Badge>
                  {u.isActive ? <Badge variant="success">Actif</Badge> : <Badge variant="destructive">Désactivé</Badge>}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block animate-fade-in">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u._id === me?.id && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Administrateur' : 'Éditeur'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? <Badge variant="success">Actif</Badge> : <Badge variant="destructive">Désactivé</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={u._id === me?.id}
                          onClick={() => setToDelete(u)}
                        >
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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>Créez un nouvel administrateur ou éditeur.</DialogDescription>
          </DialogHeader>
          <UserForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <UserForm isEdit defaultValues={editing} submitting={updateMut.isPending}
              onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
              onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cet utilisateur ?"
        description={toDelete ? `Le compte « ${toDelete.name} » sera supprimé définitivement.` : ''}
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
