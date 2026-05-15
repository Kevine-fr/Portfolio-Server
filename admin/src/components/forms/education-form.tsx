'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Education } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';

const schema = z.object({
  school:      z.string().min(2),
  degree:      z.string().min(2),
  field:       z.string().optional(),
  location:    z.string().optional(),
  startDate:   z.string().min(1),
  endDate:     z.string().optional(),
  description: z.string().optional(),
  order:       z.coerce.number().int().optional(),
});

type Values = z.infer<typeof schema>;

export function EducationForm({
  defaultValues, onSubmit, submitting, onCancel,
}: {
  defaultValues?: Partial<Education>;
  onSubmit: (data: any) => void | Promise<void>;
  submitting?: boolean;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      school:      defaultValues?.school ?? '',
      degree:      defaultValues?.degree ?? '',
      field:       defaultValues?.field ?? '',
      location:    defaultValues?.location ?? '',
      startDate:   defaultValues?.startDate ? defaultValues.startDate.slice(0, 10) : '',
      endDate:     defaultValues?.endDate   ? defaultValues.endDate.slice(0, 10)   : '',
      description: defaultValues?.description ?? '',
      order:       defaultValues?.order ?? 0,
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Établissement" required error={errors.school?.message}>
          <Input {...register('school')} />
        </FormField>
        <FormField label="Diplôme" required error={errors.degree?.message}>
          <Input {...register('degree')} />
        </FormField>
        <FormField label="Domaine d'études"><Input {...register('field')} /></FormField>
        <FormField label="Lieu"><Input {...register('location')} /></FormField>
        <FormField label="Date de début" required error={errors.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </FormField>
        <FormField label="Date de fin"><Input type="date" {...register('endDate')} /></FormField>
      </div>
      <FormField label="Description"><Textarea rows={3} {...register('description')} /></FormField>
      <FormField label="Ordre"><Input type="number" {...register('order')} /></FormField>
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
