'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { Project } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectForm } from '@/components/forms/ProjectForm';

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
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created'); setCreating(false); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/projects/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project updated'); setEditing(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/projects/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); setToDelete(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <>
      <PageHeader
        prompt="projects.list"
        title="Projects"
        subtitle="Manage the constellation of work showcased in your portfolio."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ new project</button>}
      />

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create the first project to seed the constellation."
          action={<button className="btn-primary" onClick={() => setCreating(true)}>+ new project</button>}
        />
      ) : (
        <div className="card-gold overflow-x-auto">
          <table className="table-gold">
            <thead>
              <tr>
                <th>Title</th><th>Slug</th><th>Status</th><th>Year</th><th>Order</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {p.featured && <span className="text-goldGlow" title="Featured">★</span>}
                      <span className="text-whiteHex">{p.title}</span>
                    </div>
                    {p.subtitle && <p className="text-xs text-muted mt-0.5">{p.subtitle}</p>}
                  </td>
                  <td className="font-mono text-xs text-goldPale">{p.slug}</td>
                  <td>
                    <span className={`badge ${
                      p.status === 'published' ? 'badge-success' :
                      p.status === 'draft'     ? 'badge-gold'    : 'badge-muted'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{p.year ?? '—'}</td>
                  <td className="font-mono text-xs">{p.order}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setEditing(p)}>edit</button>
                      <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => setToDelete(p)}>delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New project" prompt="projects.create" size="lg">
        <ProjectForm
          submitting={createMut.isPending}
          onSubmit={(payload) => createMut.mutateAsync(payload)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit · ${editing?.title ?? ''}`} prompt="projects.edit" size="lg">
        {editing && (
          <ProjectForm
            defaultValues={editing}
            submitting={updateMut.isPending}
            onSubmit={(payload) => updateMut.mutateAsync({ id: editing._id, payload })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.title}"?`}
        description="This action cannot be undone."
        destructive
        confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
