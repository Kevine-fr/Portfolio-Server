'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Experience } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';

const schema = z.object({
  title:        z.string().min(2),
  company:      z.string().min(2),
  location:     z.string().optional(),
  startDate:    z.string().min(1, 'Date requise'),
  endDate:      z.string().optional(),
  current:      z.boolean().optional(),
  description:  z.string().optional(),
  achievements: z.string().optional(),
  techStack:    z.string().optional(),
  order:        z.coerce.number().int().optional(),
});

type Values = z.infer<typeof schema>;

export function ExperienceForm({
  defaultValues, onSubmit, submitting, onCancel,
}: {
  defaultValues?: Partial<Experience>;
  onSubmit: (data: any) => void | Promise<void>;
  submitting?: boolean;
  onCancel: () => void;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:        defaultValues?.title ?? '',
      company:      defaultValues?.company ?? '',
      location:     defaultValues?.location ?? '',
      startDate:    defaultValues?.startDate ? defaultValues.startDate.slice(0, 10) : '',
      endDate:      defaultValues?.endDate   ? defaultValues.endDate.slice(0, 10)   : '',
      current:      defaultValues?.current ?? false,
      description:  defaultValues?.description ?? '',
      achievements: defaultValues?.achievements?.join('\n') ?? '',
      techStack:    defaultValues?.techStack?.join(', ') ?? '',
      order:        defaultValues?.order ?? 0,
    },
  });

  const current = watch('current');

  const internalSubmit = (raw: Values) => {
    const payload = {
      ...raw,
      achievements: raw.achievements ? raw.achievements.split('\n').map((a) => a.trim()).filter(Boolean) : [],
      techStack:    raw.techStack    ? raw.techStack.split(',').map((t) => t.trim()).filter(Boolean)    : [],
      endDate:      raw.current ? undefined : raw.endDate || undefined,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Poste" required error={errors.title?.message}>
          <Input {...register('title')} />
        </FormField>
        <FormField label="Entreprise" required error={errors.company?.message}>
          <Input {...register('company')} />
        </FormField>
        <FormField label="Lieu"><Input {...register('location')} /></FormField>
        <FormField label="Ordre"><Input type="number" {...register('order')} /></FormField>
        <FormField label="Date de début" required error={errors.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </FormField>
        <FormField label="Date de fin" hint={current ? 'Désactivé (poste en cours)' : undefined}>
          <Input type="date" {...register('endDate')} disabled={current} />
        </FormField>
      </div>
      <div className="flex items-start gap-3 rounded-md border p-4">
        <Checkbox id="current" checked={current} onCheckedChange={(v) => setValue('current', !!v)} />
        <div className="space-y-1">
          <label htmlFor="current" className="text-sm font-medium leading-none cursor-pointer">
            Poste actuel
          </label>
          <p className="text-xs text-muted-foreground">Cochez si vous occupez encore ce poste.</p>
        </div>
      </div>
      <FormField label="Description"><Textarea rows={3} {...register('description')} /></FormField>
      <FormField label="Réalisations" hint="Une par ligne">
        <Textarea rows={4} {...register('achievements')} placeholder="Mise en place de…" />
      </FormField>
      <FormField label="Technologies" hint="Séparées par des virgules">
        <Input placeholder="React, Node.js, Docker" {...register('techStack')} />
      </FormField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
