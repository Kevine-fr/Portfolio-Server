'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Loader2, Info } from 'lucide-react';
import { apiGet, api, getErrorMessage } from '@/lib/api';
import type { About, TimelineEntry, ValueEntry } from '@/types';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';

// Small helper since lib/api.ts doesn't expose apiPut
const apiPut = <T,>(url: string, data?: any) => api.put<T>(url, data).then(r => r.data);

const ICON_PRESETS = ['◆', '✦', '◈', '✧', '★', '✷', '✺', '✹', '✸', '◇', '○', '◉'];

export default function AboutPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['about'],
    queryFn:  () => apiGet<About>('/about'),
  });

  // Local form state — initialized from query
  const [title, setTitle] = useState('');
  const [bio, setBio]     = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [values, setValues]     = useState<ValueEntry[]>([]);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title || 'Qui suis-je ?');
    setBio(data.bio || '');
    setTimeline([...(data.timeline || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setValues([...(data.values || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (payload: any) => apiPut('/about', payload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['about'] }); toast.success('À propos enregistré'); },
    onError:    (err) => toast.error('Échec de l\'enregistrement', { description: getErrorMessage(err) }),
  });

  const save = () => {
    saveMut.mutate({
      title: title.trim() || 'Qui suis-je ?',
      bio: bio.trim(),
      timeline: timeline.map((t, i) => ({ ...t, order: i })),
      values:   values.map((v, i)   => ({ ...v, order: i })),
    });
  };

  // Timeline helpers
  const addTimeline = () => setTimeline([...timeline, { year: '', title: '', description: '' }]);
  const updateTimeline = (i: number, patch: Partial<TimelineEntry>) =>
    setTimeline(timeline.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  const removeTimeline = (i: number) => setTimeline(timeline.filter((_, idx) => idx !== i));
  const moveTimeline = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= timeline.length) return;
    const next = [...timeline];
    [next[i], next[target]] = [next[target], next[i]];
    setTimeline(next);
  };

  // Values helpers
  const addValue = () => setValues([...values, { icon: '◆', title: '', description: '' }]);
  const updateValue = (i: number, patch: Partial<ValueEntry>) =>
    setValues(values.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const removeValue = (i: number) => setValues(values.filter((_, idx) => idx !== i));
  const moveValue = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[i], next[target]] = [next[target], next[i]];
    setValues(next);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="À propos" description="Section présentation du portfolio." />
        <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="À propos"
        description="Édite la présentation, le parcours et les valeurs affichés sur le portfolio."
        actions={
          <Button onClick={save} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        }
      />

      <div className="space-y-6">
        {/* ─── Bio ───────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Présentation</CardTitle>
            <CardDescription>
              Le titre et le texte affichés en haut de la section "À propos" du portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Titre">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qui suis-je ?" />
            </FormField>
            <FormField
              label="Biographie"
              hint="Entoure un mot ou groupe de mots avec **double astérisques** pour le mettre en évidence (jaune doré)."
            >
              <Textarea
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Developpeur passionne par la convergence du **design**, de la **3D** et de l'**ingenierie logicielle**…"
              />
            </FormField>
            {bio && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> Aperçu :
                </p>
                <p
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(bio).replace(
                      /\*\*([^*]+)\*\*/g,
                      '<span style="color:#ffd97a;font-weight:600">$1</span>',
                    ),
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Timeline (parcours.log) ───────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Parcours</CardTitle>
              <CardDescription>Étapes affichées en colonne gauche ({timeline.length})</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addTimeline}>
              <Plus className="h-3.5 w-3.5" /> Ajouter une étape
            </Button>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune étape — ajoutez votre premier jalon temporel.
              </p>
            ) : (
              <div className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[80px_1fr_2fr_auto] gap-2 items-start rounded-md border p-3 bg-card">
                    <div>
                      <Input
                        value={t.year}
                        onChange={(e) => updateTimeline(i, { year: e.target.value })}
                        placeholder="2024"
                        className="text-center font-mono"
                      />
                    </div>
                    <Input
                      value={t.title}
                      onChange={(e) => updateTimeline(i, { title: e.target.value })}
                      placeholder="Titre de l'étape"
                    />
                    <Input
                      value={t.description || ''}
                      onChange={(e) => updateTimeline(i, { description: e.target.value })}
                      placeholder="Brève description"
                    />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveTimeline(i, -1)} disabled={i === 0}>
                        <GripVertical className="h-3.5 w-3.5 rotate-90" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveTimeline(i, 1)} disabled={i === timeline.length - 1}>
                        <GripVertical className="h-3.5 w-3.5 -rotate-90" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeTimeline(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Values (valeurs.cfg) ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Valeurs</CardTitle>
              <CardDescription>Cartes affichées en colonne droite ({values.length})</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addValue}>
              <Plus className="h-3.5 w-3.5" /> Ajouter une valeur
            </Button>
          </CardHeader>
          <CardContent>
            {values.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune valeur — ajoutez votre première.
              </p>
            ) : (
              <div className="space-y-3">
                {values.map((v, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-[80px_1fr_2fr_auto] gap-2 items-start rounded-md border p-3 bg-card">
                    <div className="space-y-1">
                      <Input
                        value={v.icon}
                        onChange={(e) => updateValue(i, { icon: e.target.value })}
                        placeholder="◆"
                        className="text-center text-lg"
                        maxLength={4}
                      />
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {ICON_PRESETS.slice(0, 6).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => updateValue(i, { icon: p })}
                            className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      value={v.title}
                      onChange={(e) => updateValue(i, { title: e.target.value })}
                      placeholder="Précision"
                    />
                    <Textarea
                      rows={2}
                      value={v.description || ''}
                      onChange={(e) => updateValue(i, { description: e.target.value })}
                      placeholder="Description courte de cette valeur."
                      className="min-h-[40px]"
                    />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveValue(i, -1)} disabled={i === 0}>
                        <GripVertical className="h-3.5 w-3.5 rotate-90" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveValue(i, 1)} disabled={i === values.length - 1}>
                        <GripVertical className="h-3.5 w-3.5 -rotate-90" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeValue(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sticky bottom save */}
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={save} disabled={saveMut.isPending} size="lg" className="shadow-lg">
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
