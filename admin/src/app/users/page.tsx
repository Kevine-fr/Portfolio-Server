'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDel } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserForm } from '@/components/forms/UserForm';

export default function UsersPage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ['users'], queryFn: () => apiGet<User[]>('/users') });

  const createMut = useMutation({
    mutationFn: (p: any) => apiPost('/users', p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); setCreating(false); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/users/${id}`, payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); setEditing(null); },
    onError:    (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/users/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Deleted'); setToDelete(null); },
  });

  if (me?.role !== 'admin') {
    return (
      <>
        <PageHeader prompt="users.denied" title="Restricted area" />
        <EmptyState title="Admin only" description="You need administrator privileges to manage users." />
      </>
    );
  }

  return (
    <>
      <PageHeader prompt="users.list" title="Users"
        subtitle="Manage administrators and editors."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ new user</button>} />

      {isLoading ? <Loader /> :
        isError ? <EmptyState title="Could not load users" description="Check your permissions or try again later." /> :
        !data || data.length === 0 ? (
          <EmptyState title="No users yet" action={<button className="btn-primary" onClick={() => setCreating(true)}>+ new user</button>} />
        ) : (
          <div className="card-gold overflow-x-auto">
            <table className="table-gold">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u._id}>
                    <td className="text-whiteHex">{u.name} {u._id === me?.id && <span className="badge badge-gold ml-2">you</span>}</td>
                    <td className="text-goldPale font-mono text-xs">{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-muted'}`}>{u.role}</span></td>
                    <td>{u.isActive ? <span className="badge badge-success">active</span> : <span className="badge badge-danger">disabled</span>}</td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => setEditing(u)}>edit</button>
                        <button className="btn-danger !px-3 !py-1 !text-xs" disabled={u._id === me?.id} onClick={() => setToDelete(u)}>delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      <Modal open={creating} onClose={() => setCreating(false)} title="New user" prompt="users.create">
        <UserForm submitting={createMut.isPending} onSubmit={(p) => createMut.mutateAsync(p)} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit · ${editing?.name}`} prompt="users.edit">
        {editing && (
          <UserForm isEdit defaultValues={editing} submitting={updateMut.isPending}
            onSubmit={(p) => updateMut.mutateAsync({ id: editing._id, payload: p })}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} title={`Delete user "${toDelete?.name}"?`} destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
