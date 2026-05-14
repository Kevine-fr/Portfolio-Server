'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '@/components/ui/Field';
import { Education } from '@/types';

const schema = z.object({
  school:      z.string().min(2),
  degree:      z.string().min(2),
  field:       z.string().optional(),
  location:    z.string().optional(),
  startDate:   z.string(),
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="School"  required {...register('school')}  error={errors.school?.message} />
        <Input label="Degree"  required {...register('degree')}  error={errors.degree?.message} />
        <Input label="Field of study" {...register('field')} />
        <Input label="Location" {...register('location')} />
        <Input label="Start date" type="date" required {...register('startDate')} />
        <Input label="End date"   type="date"          {...register('endDate')} />
      </div>
      <Textarea label="Description" rows={3} {...register('description')} />
      <Input label="Order" type="number" {...register('order')} />
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-goldDeep/15">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '> save'}</button>
      </div>
    </form>
  );
}
