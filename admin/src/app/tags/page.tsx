'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X, Tag as TagIcon, Loader2 } from 'lucide-react';
import { apiGet, apiPost, apiDel, getErrorMessage } from '@/lib/api';
import { Tag } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function TagsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [toDelete, setToDelete] = useState<Tag | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['tags'], queryFn: () => apiGet<Tag[]>('/tags') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/tags', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Étiquette créée'); setName(''); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/tags/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Supprimée'); setToDelete(null); },
    onError:    (err) => toast.error('Échec', { description: getErrorMessage(err) }),
  });

  const submit = () => {
    if (!name.trim()) return;
    createMut.mutate({ name: name.trim(), slug: slugify(name), color });
  };

  return (
    <>
      <PageHeader title="Étiquettes" description="Catégorisez vos projets et contenus." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Créer une étiquette</CardTitle>
          <CardDescription>Le slug est généré automatiquement à partir du nom.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="Nom" className="flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="WebGL"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </FormField>
            <FormField label="Couleur" className="w-24">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 cursor-pointer p-1" />
            </FormField>
            <Button onClick={submit} disabled={createMut.isPending || !name.trim()}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </Button>
          </div>
          {name && <p className="mt-2 text-xs text-muted-foreground">Slug : <span className="font-mono">{slugify(name)}</span></p>}
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={TagIcon} title="Aucune étiquette" description="Créez votre première étiquette ci-dessus." />
      ) : (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Étiquettes ({data.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.map((t) => (
                <div
                  key={t._id}
                  className="group inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors hover:border-foreground/30"
                  style={{ borderColor: t.color ? `${t.color}40` : undefined, backgroundColor: t.color ? `${t.color}10` : undefined }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color || 'hsl(var(--muted-foreground))' }} />
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.slug}</span>
                  <button
                    onClick={() => setToDelete(t)}
                    className="ml-1 rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette étiquette ?"
        description={toDelete ? `« ${toDelete.name} » sera retirée de tous les projets l'utilisant.` : ''}
        confirmLabel="Supprimer" destructive loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
      />
    </>
  );
}
