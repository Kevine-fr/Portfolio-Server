'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Skill } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ImageUpload } from '@/components/ui/image-upload';

const schema = z.object({
  name:     z.string().min(2),
  category: z.enum(['frontend', 'backend', 'tools', 'design', 'other']),
  level:    z.coerce.number().int().min(0).max(100),
  icon:     z.string().optional(),
  order:    z.coerce.number().int().optional(),
  visible:  z.boolean().optional(),
});

const CATEGORY_LABELS = {
  frontend: 'Frontend', backend: 'Backend', tools: 'Outils', design: 'Design', other: 'Autre',
};

type Values = z.infer<typeof schema>;

export function SkillForm({
  defaultValues, onSubmit, submitting, onCancel,
}: {
  defaultValues?: Partial<Skill>;
  onSubmit: (data: any) => unknown | Promise<unknown>;
  submitting?: boolean;
  onCancel: () => void;
}) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:     defaultValues?.name ?? '',
      category: (defaultValues?.category as any) ?? 'frontend',
      level:    defaultValues?.level ?? 50,
      icon:     defaultValues?.icon ?? '',
      order:    defaultValues?.order ?? 0,
      visible:  defaultValues?.visible ?? true,
    },
  });

  const category = watch('category');
  const visible = watch('visible');

  const internalSubmit = (raw: Values) => onSubmit({ ...raw, icon: raw.icon || undefined });

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nom" required error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
        <FormField label="Catégorie" required>
          <Select value={category} onValueChange={(v) => setValue('category', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Niveau (0-100)" required error={errors.level?.message}>
          <Input type="number" min={0} max={100} {...register('level')} />
        </FormField>
        <FormField label="Ordre">
          <Input type="number" {...register('order')} />
        </FormField>
      </div>

      <FormField label="Icône (facultatif)" hint="Image carrée, fond transparent recommandé">
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <ImageUpload size="sm" value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>

      <div className="flex items-start gap-3 rounded-md border p-4">
        <Checkbox id="visible" checked={visible} onCheckedChange={(v) => setValue('visible', !!v)} />
        <label htmlFor="visible" className="text-sm font-medium leading-none cursor-pointer">
          Visible dans le portfolio
        </label>
      </div>
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
