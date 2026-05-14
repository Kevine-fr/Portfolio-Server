'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { Education } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EducationForm } from '@/components/forms/EducationForm';

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }) : 'present';

export default function EducationPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Education | null>(null);
  const [toDelete, setToDelete] = useState<Education | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['education'], queryFn: () => apiGet<Education[]>('/education') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/education', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Created'); setCreating(false); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/education/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Updated'); setEditing(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/education/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['education'] }); toast.success('Deleted'); setToDelete(null); },
  });

  return (
    <>
      <PageHeader prompt="education.list" title="Education"
        subtitle="Academic journey before the cosmos."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ new entry</button>} />

      {isLoading ? <Loader /> :
        !data || data.length === 0 ? (
          <EmptyState title="No education entries yet" action={<button className="btn-primary" onClick={() => setCreating(true)}>+ new entry</button>} />
        ) : (
          <div className="space-y-4">
            {data.map((e) => (
              <div key={e._id} className="card-gold p-5 group">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-whiteHex font-semibold">{e.degree}{e.field ? ` · ${e.field}` : ''}</h3>
                    <p className="text-goldPale text-sm font-mono mb-1">{e.school}{e.location ? ` · ${e.location}` : ''}</p>
                    <p className="text-muted text-xs font-mono mb-2">{fmt(e.startDate)} → {fmt(e.endDate)}</p>
                    {e.description && <p className="text-whiteHex/80 text-sm">{e.description}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setEditing(e)}>edit</button>
                    <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => setToDelete(e)}>delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={creating} onClose={() => setCreating(false)} title="New education" prompt="education.create">
        <EducationForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit · ${editing?.degree}`} prompt="education.edit">
        {editing && (
          <EducationForm defaultValues={editing} submitting={updateMut.isPending}
            onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} title={`Delete "${toDelete?.degree}"?`} destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
