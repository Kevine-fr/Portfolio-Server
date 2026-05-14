'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { Experience } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExperienceForm } from '@/components/forms/ExperienceForm';

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }) : '';

export default function ExperiencesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Experience | null>(null);
  const [toDelete, setToDelete] = useState<Experience | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['experiences'], queryFn: () => apiGet<Experience[]>('/experiences') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/experiences', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Experience created'); setCreating(false); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/experiences/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Experience updated'); setEditing(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/experiences/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); toast.success('Deleted'); setToDelete(null); },
  });

  return (
    <>
      <PageHeader
        prompt="experiences.timeline"
        title="Experiences"
        subtitle="Professional journey across the constellation of work."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ new experience</button>}
      />

      {isLoading ? <Loader /> :
        !data || data.length === 0 ? (
          <EmptyState
            title="Empty timeline"
            description="Add your first experience."
            action={<button className="btn-primary" onClick={() => setCreating(true)}>+ new experience</button>}
          />
        ) : (
          <div className="space-y-4">
            {data.map((x) => (
              <div key={x._id} className="card-gold p-5 group">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-whiteHex font-semibold">{x.title}</h3>
                      {x.current && <span className="badge badge-success">current</span>}
                    </div>
                    <p className="text-goldPale text-sm font-mono mb-1">{x.company}{x.location ? ` · ${x.location}` : ''}</p>
                    <p className="text-muted text-xs font-mono mb-3">{fmt(x.startDate)} → {x.current ? 'present' : fmt(x.endDate)}</p>
                    {x.description && <p className="text-whiteHex/80 text-sm mb-2">{x.description}</p>}
                    {x.achievements.length > 0 && (
                      <ul className="text-sm text-whiteHex/70 list-disc list-inside space-y-0.5 mb-2">
                        {x.achievements.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                    {x.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {x.techStack.map((t) => <span key={t} className="badge badge-muted">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setEditing(x)}>edit</button>
                    <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => setToDelete(x)}>delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={creating} onClose={() => setCreating(false)} title="New experience" prompt="experiences.create" size="lg">
        <ExperienceForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit · ${editing?.title}`} prompt="experiences.edit" size="lg">
        {editing && (
          <ExperienceForm defaultValues={editing} submitting={updateMut.isPending}
            onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} title={`Delete "${toDelete?.title}"?`} destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
