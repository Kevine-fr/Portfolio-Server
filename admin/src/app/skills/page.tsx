'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { Skill, SkillCategory } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkillForm } from '@/components/forms/SkillForm';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: 'Frontend', backend: 'Backend', tools: 'Tools', design: 'Design', other: 'Other',
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
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill created'); setCreating(false); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/skills/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill updated'); setEditing(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/skills/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill deleted'); setToDelete(null); },
  });

  return (
    <>
      <PageHeader
        prompt="skills.constellation"
        title="Skills"
        subtitle="Curate the stars of your constellation."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ new skill</button>}
      />

      {isLoading ? <Loader /> :
        !data || data.length === 0 ? (
          <EmptyState
            title="No skills yet"
            description="Add skills grouped by category. Each becomes a star in the portfolio constellation."
            action={<button className="btn-primary" onClick={() => setCreating(true)}>+ new skill</button>}
          />
        ) : (
          <div className="space-y-6">
            {(Object.keys(grouped) as SkillCategory[]).map((cat) => grouped[cat].length === 0 ? null : (
              <div key={cat} className="card-gold p-6">
                <p className="console-label mb-4">{`> ${cat}`} · {grouped[cat].length}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {grouped[cat].map((s) => (
                    <div key={s._id} className="flex items-center justify-between p-3 bg-surface2/40 border border-goldDeep/10 rounded-sm hover:border-goldDeep/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-whiteHex font-mono text-sm truncate">{s.name}</p>
                          {!s.visible && <span className="badge badge-muted">hidden</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-goldDeep/15 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-goldDeep to-goldGlow" style={{ width: `${s.level}%` }} />
                          </div>
                          <span className="font-mono text-xs text-goldPale">{s.level}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => setEditing(s)}>edit</button>
                        <button className="btn-danger !px-2 !py-1 !text-[10px]" onClick={() => setToDelete(s)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={creating} onClose={() => setCreating(false)} title="New skill" prompt="skills.create">
        <SkillForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit · ${editing?.name ?? ''}`} prompt="skills.edit">
        {editing && (
          <SkillForm defaultValues={editing} submitting={updateMut.isPending}
            onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} title={`Delete "${toDelete?.name}"?`} destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
