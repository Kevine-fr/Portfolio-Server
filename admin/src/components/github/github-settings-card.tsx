'use client';
import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { GithubSettings, RateLimit } from '@/types';
import { SYNC_INTERVALS, rateLimitLabel } from '@/lib/github';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type GithubSettingsPatch = Partial<
  Pick<
    GithubSettings,
    | 'username' | 'topic' | 'includeForks' | 'syncProjects' | 'syncSkills' | 'syncProfile'
    | 'profileRepo' | 'minLanguagePercent' | 'autoSync' | 'syncIntervalMinutes'
  >
>;

interface Props {
  settings: GithubSettings;
  rateLimit?: RateLimit | null;
  canEdit: boolean;
  saving?: boolean;
  onSave: (patch: GithubSettingsPatch) => unknown;
}

const LOGIN_RE = /^$|^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

function toForm(s: GithubSettings) {
  return {
    username: s.username ?? '',
    topic: s.topic ?? '',
    includeForks: !!s.includeForks,
    syncProjects: s.syncProjects !== false,
    syncSkills: s.syncSkills !== false,
    syncProfile: s.syncProfile !== false,
    profileRepo: s.profileRepo ?? '',
    minLanguagePercent: s.minLanguagePercent ?? 2,
    autoSync: s.autoSync !== false,
    syncIntervalMinutes: s.syncIntervalMinutes ?? 60,
  };
}

export function GithubSettingsCard({ settings, rateLimit, canEdit, saving, onSave }: Props) {
  const [form, setForm] = useState(() => toForm(settings));
  useEffect(() => setForm(toForm(settings)), [settings]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const usernameError = LOGIN_RE.test(form.username.trim()) ? undefined : 'Identifiant GitHub invalide';
  const topicError = /^$|^[a-z0-9][a-z0-9-]*$/i.test(form.topic.trim()) ? undefined : 'Lettres, chiffres et tirets uniquement';
  const invalid = !!usernameError || !!topicError;
  const quota = rateLimitLabel(rateLimit);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    onSave({
      ...form,
      username: form.username.trim(),
      topic: form.topic.trim().toLowerCase(),
      profileRepo: form.profileRepo.trim(),
      minLanguagePercent: Math.max(0, Math.min(50, Math.round(Number(form.minLanguagePercent) || 0))),
    });
  };

  const toggles: Array<{ key: 'syncProjects' | 'syncSkills' | 'syncProfile' | 'includeForks'; label: string; hint: string }> = [
    { key: 'syncProjects', label: 'Projets', hint: 'Un projet par dépôt sélectionné (README ou .portfolio.yml).' },
    { key: 'syncSkills', label: 'Compétences', hint: 'Déduites des langages et topics de vos dépôts.' },
    { key: 'syncProfile', label: 'Profil', hint: 'À propos, expériences, formations et compétences du dépôt de profil.' },
    { key: 'includeForks', label: 'Inclure les forks', hint: 'Les forks portant le topic sont aussi affichés.' },
  ];

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader>
          <CardTitle className="text-base">Connexion au compte</CardTitle>
          <CardDescription>
            Les dépôts publics de ce compte alimentent le portfolio. Aucune donnée n&apos;est écrite sur GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
              settings.tokenConfigured ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            {settings.tokenConfigured ? (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <div className="space-y-0.5">
              <p className="font-medium">
                {settings.tokenConfigured ? 'Jeton GitHub configuré' : 'Aucun jeton GitHub (60 requêtes / heure)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {settings.tokenConfigured
                  ? 'Quota de 5000 requêtes / heure.'
                  : 'Ajoutez la variable GITHUB_TOKEN côté serveur (jeton en lecture seule) pour des synchronisations fiables.'}
                {quota && <> · {quota}</>}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Identifiant GitHub" required htmlFor="gh-username" error={usernameError}
              hint={!settings.username && settings.effectiveUsername ? `Par défaut : ${settings.effectiveUsername} (GITHUB_USERNAME)` : 'ex. Kevine-fr'}>
              <Input id="gh-username" value={form.username} disabled={!canEdit} autoComplete="off"
                placeholder={settings.effectiveUsername || 'Kevine-fr'} onChange={(e) => set('username', e.target.value)} />
            </FormField>
            <FormField label="Topic d'inclusion automatique" htmlFor="gh-topic" error={topicError}
              hint="Ajoutez ce topic à un dépôt pour l'afficher. Vide = sélection manuelle uniquement.">
              <Input id="gh-topic" value={form.topic} disabled={!canEdit} placeholder="portfolio"
                onChange={(e) => set('topic', e.target.value)} />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {toggles.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <Checkbox checked={form[t.key]} disabled={!canEdit} onCheckedChange={(v) => set(t.key, !!v)} aria-label={t.label} />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium leading-none">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Dépôt de profil" htmlFor="gh-profile" hint="Contient le .portfolio.yml du profil.">
              <Input id="gh-profile" value={form.profileRepo} disabled={!canEdit}
                placeholder={form.username || settings.effectiveUsername || 'identifiant'}
                onChange={(e) => set('profileRepo', e.target.value)} />
            </FormField>
            <FormField label="Part minimale d'un langage (%)" htmlFor="gh-minlang" hint="En dessous, pas de compétence créée.">
              <Input id="gh-minlang" type="number" min={0} max={50} value={form.minLanguagePercent} disabled={!canEdit}
                onChange={(e) => set('minLanguagePercent', Number(e.target.value))} />
            </FormField>
            <FormField label="Synchronisation automatique">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.autoSync} disabled={!canEdit} onCheckedChange={(v) => set('autoSync', !!v)}
                  aria-label="Synchronisation automatique" />
                <Select value={String(form.syncIntervalMinutes)} disabled={!canEdit || !form.autoSync}
                  onValueChange={(v) => set('syncIntervalMinutes', Number(v))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SYNC_INTERVALS.map((i) => <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </FormField>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3 w-3" /> Le jeton n&apos;est jamais stocké en base ni affiché ici.
          </p>
          {canEdit ? (
            <Button type="submit" disabled={saving || invalid}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Seul un administrateur peut modifier ces réglages.</p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
