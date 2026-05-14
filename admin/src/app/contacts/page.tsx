'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiDel } from '@/lib/api';
import { Contact } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Filter = 'all' | 'unread' | 'archived';

export default function ContactsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Contact | null>(null);
  const [toDelete, setToDelete] = useState<Contact | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => apiGet<Contact[]>('/contacts') });

  const filtered = (data ?? []).filter((c) => {
    if (filter === 'unread')   return !c.read && !c.archived;
    if (filter === 'archived') return c.archived;
    return !c.archived;
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiPatch(`/contacts/${id}`, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDel(`/contacts/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Deleted'); setToDelete(null); setOpen(null); },
  });

  const openContact = (c: Contact) => {
    setOpen(c);
    if (!c.read) updateMut.mutate({ id: c._id, payload: { read: true } });
  };

  return (
    <>
      <PageHeader prompt="contacts.inbox" title="Contacts"
        subtitle="Messages reaching out from across the cosmos."
        actions={
          <div className="inline-flex border border-goldDeep/30 rounded-sm overflow-hidden">
            {(['all', 'unread', 'archived'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${filter === f ? 'bg-goldDeep/20 text-goldGlow' : 'text-muted hover:text-goldPale'}`}>
                {f}
              </button>
            ))}
          </div>
        } />

      {isLoading ? <Loader /> :
        filtered.length === 0 ? (
          <EmptyState title={`No ${filter === 'all' ? '' : filter} messages`} description="The constellation is quiet." />
        ) : (
          <div className="card-gold overflow-x-auto">
            <table className="table-gold">
              <thead><tr><th></th><th>From</th><th>Subject</th><th>Preview</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id} className={`cursor-pointer ${!c.read ? 'bg-goldDeep/5' : ''}`} onClick={() => openContact(c)}>
                    <td>{!c.read && <span className="block w-2 h-2 rounded-full bg-goldGlow animate-twinkle" />}</td>
                    <td>
                      <p className={`font-mono text-sm ${!c.read ? 'text-whiteHex font-semibold' : 'text-whiteHex/80'}`}>{c.name}</p>
                      <p className="text-muted text-xs">{c.email}</p>
                    </td>
                    <td className="text-whiteHex/80 max-w-xs truncate">{c.subject || '—'}</td>
                    <td className="text-muted text-xs max-w-md truncate">{c.message.slice(0, 80)}{c.message.length > 80 ? '...' : ''}</td>
                    <td className="text-muted text-xs font-mono whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>{c.archived && <span className="badge badge-muted">archived</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject || '(no subject)'} prompt={`contacts.${open?._id?.slice(-6)}`} size="lg">
        {open && (
          <div>
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-goldDeep/10">
              <div>
                <p className="text-whiteHex font-mono">{open.name}</p>
                <a href={`mailto:${open.email}`} className="text-goldPale text-sm hover:text-goldGlow">{open.email}</a>
              </div>
              <p className="text-muted text-xs font-mono">{new Date(open.createdAt).toLocaleString('fr-FR')}</p>
            </div>
            <div className="bg-surface2/40 border border-goldDeep/10 rounded-sm p-4 mb-4">
              <p className="text-whiteHex/90 whitespace-pre-wrap leading-relaxed">{open.message}</p>
            </div>
            {(open.ip || open.userAgent) && (
              <div className="text-xs font-mono text-muted space-y-1 mb-4">
                {open.ip && <p>IP: {open.ip}</p>}
                {open.userAgent && <p className="truncate">UA: {open.userAgent}</p>}
              </div>
            )}
            <div className="flex justify-between gap-2 pt-4 border-t border-goldDeep/10">
              <button className="btn-danger" onClick={() => setToDelete(open)}>delete</button>
              <div className="flex gap-2">
                <a className="btn-ghost" href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject || '')}`}>reply</a>
                <button className="btn-primary" onClick={() => { updateMut.mutate({ id: open._id, payload: { archived: !open.archived } }); setOpen(null); }}>
                  {open.archived ? 'unarchive' : 'archive'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete this message?" description="This action cannot be undone." destructive confirmLabel="Delete"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete._id)} onCancel={() => setToDelete(null)} />
    </>
  );
}
