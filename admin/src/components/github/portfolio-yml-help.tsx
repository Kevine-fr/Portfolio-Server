'use client';
import { useState } from 'react';
import { BookOpen, Check, Copy } from 'lucide-react';
import { PROFILE_YAML_EXAMPLE, PROJECT_YAML_EXAMPLE } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="relative">
      <Button type="button" size="sm" variant="ghost" className="absolute right-2 top-2 h-7 text-xs" onClick={copy} aria-label={`Copier ${label}`}>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copié' : 'Copier'}
      </Button>
      <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

export function PortfolioYmlHelp() {
  const [tab, setTab] = useState<'project' | 'profile'>('project');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Personnaliser depuis vos dépôts</CardTitle>
        <CardDescription>
          Sans configuration, le README, la description, les topics et les langages du dépôt sont utilisés.
          Un fichier <code className="rounded bg-muted px-1">.portfolio.yml</code> permet d&apos;aller plus loin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="inline-flex gap-1 rounded-md border p-1">
          <Button type="button" size="sm" variant={tab === 'project' ? 'secondary' : 'ghost'} onClick={() => setTab('project')}>Dans un projet</Button>
          <Button type="button" size="sm" variant={tab === 'profile' ? 'secondary' : 'ghost'} onClick={() => setTab('profile')}>Dans le dépôt de profil</Button>
        </div>
        {tab === 'project'
          ? <CodeBlock code={PROJECT_YAML_EXAMPLE} label="l'exemple de projet" />
          : <CodeBlock code={PROFILE_YAML_EXAMPLE} label="l'exemple de profil" />}
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Champs pilotés par GitHub : titre, description, contenu, technologies, liens, statut et année.</li>
          <li>Champs conservés depuis l&apos;admin (sauf s&apos;ils sont définis dans le fichier) : sous-titre, galerie, vidéo, mise en avant, ordre et image de couverture importée.</li>
          <li>Les éléments saisis manuellement dans l&apos;admin ne sont jamais modifiés ni supprimés par la synchronisation.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
