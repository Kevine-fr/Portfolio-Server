'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Search, X, Sparkles } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Skill, SkillCategory } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: 'Frontend', backend: 'Backend', tools: 'Outils', design: 'Design', other: 'Autre',
};

interface Props {
  value: string[];                          // selected skill names
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function SkillsMultiSelect({ value, onChange, placeholder = 'Sélectionner des compétences…', className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn:  () => apiGet<Skill[]>('/skills'),
  });

  // Filter & group skills
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? skills.filter((s) => s.name.toLowerCase().includes(q)) : skills;
    const g: Record<SkillCategory, Skill[]> = { frontend: [], backend: [], tools: [], design: [], other: [] };
    filtered.forEach((s) => g[s.category]?.push(s));
    return g;
  }, [skills, search]);

  // Skills that are selected but no longer present in the Skills DB (legacy/free text)
  const orphans = useMemo(
    () => value.filter((name) => !skills.some((s) => s.name === name)),
    [value, skills],
  );

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((n) => n !== name));
    } else {
      onChange([...value, name]);
    }
  };

  const clear = (name: string) => onChange(value.filter((n) => n !== name));

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate text-muted-foreground">
              <Sparkles className="h-4 w-4 shrink-0" />
              {value.length > 0
                ? `${value.length} compétence${value.length > 1 ? 's' : ''} sélectionnée${value.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] max-h-[60vh] overflow-hidden p-0"
        >
          {/* Search */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="h-9 pl-7"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto p-1">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : skills.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <p>Aucune compétence enregistrée.</p>
                <p className="mt-1 text-xs">Créez-en d'abord dans la section Compétences.</p>
              </div>
            ) : (
              (Object.keys(grouped) as SkillCategory[]).map((cat) =>
                grouped[cat].length === 0 ? null : (
                  <div key={cat} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[cat]}
                    </div>
                    {grouped[cat].map((s) => {
                      const checked = value.includes(s.name);
                      return (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => toggle(s.name)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            checked && 'bg-accent/50',
                          )}
                        >
                          <span>{s.name}</span>
                          {checked && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                ),
              )
            )}
            {Object.values(grouped).every((arr) => arr.length === 0) && search && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {search} ».
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
            <span>{value.length} sélectionnée{value.length > 1 ? 's' : ''}</span>
            {value.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
                Tout effacer
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge
              key={name}
              variant={orphans.includes(name) ? 'outline' : 'secondary'}
              className="gap-1 pr-1 pl-2 py-0.5"
              title={orphans.includes(name) ? 'Compétence non répertoriée — sera conservée mais à recréer' : undefined}
            >
              {name}
              <button
                type="button"
                onClick={() => clear(name)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
