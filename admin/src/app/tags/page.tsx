'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { Tag } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function TagsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#d4c19a');
  const [toDelete, setToDelete] = useState<Tag | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['tags'], queryFn: () => apiGet<Tag[]>('/tags') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/tags', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Tag created'); setName(''); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/tags/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/tags/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Deleted'); setToDelete(null); },
  });

  const submit = () => {
    if (!name.trim()) return;
    createMut.mutate({ name: name.trim(), slug: slugify(name), color });
  };

  return (
    <>
      <PageHeader prompt="tags.taxonomy" title="Tags" subtitle="Categorize and label everything in the constellation." />

      <div className="card-gold p-5 mb-6">
        <p className="console-label mb-3">{`> tags.create`}</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Tag name (e.g. WebGL)"
            className="input-gold flex-1"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-[42px] bg-surface2 border border-goldDeep/30 rounded-sm cursor-pointer" />
          <button className="btn-primary" onClick={submit} disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? 'Saving...' : '+ create'}
          </button>
        </div>
        {name && <p className="text-xs text-muted font-mono mt-2">slug: {slugify(name)}</p>}
      </div>

      {isLoading ? <Loader /> :
        !data || data.length === 0 ? (
          <EmptyState title="No tags yet" description="Create your first tag above." />
        ) : (
          <div className="card-gold p-5">
            <p className="console-label mb-3">{`> tags.list`} · {data.length}</p>
            <div className="flex flex-wrap gap-2">
              {data.map((t) => (
                <div key={t._id} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border" style={{ borderColor: (t.color || '#8a6f3f') + '60', backgroundColor: (t.color || '#8a6f3f') + '15' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#8a6f3f' }} />
                  <span className="text-whiteHex font-mono text-sm">{t.name}</span>
                  <span className="text-muted text-[10px] font-mono">{t.slug}</span>
                  <button className="text-muted hover:text-danger ml-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setToDelete(t)}>×</button>
                </div>
              ))}
            </div>
          </div>
        )
      }

      <ConfirmDialog open={!!toDelete} title={`Delete tag "${toDelete?.name}"?`} description="Projects using it will lose this tag." destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
