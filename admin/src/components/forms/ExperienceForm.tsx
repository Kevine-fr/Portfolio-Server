'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Checkbox } from '@/components/ui/Field';
import { Experience } from '@/types';

const schema = z.object({
  title:        z.string().min(2),
  company:      z.string().min(2),
  location:     z.string().optional(),
  startDate:    z.string(),
  endDate:      z.string().optional(),
  current:      z.boolean().optional(),
  description:  z.string().optional(),
  achievements: z.string().optional(),   // newline-separated
  techStack:    z.string().optional(),   // comma-separated
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
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
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
    <form onSubmit={handleSubmit(internalSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Title"    required {...register('title')}   error={errors.title?.message} />
        <Input label="Company"  required {...register('company')} error={errors.company?.message} />
        <Input label="Location"          {...register('location')} />
        <Input label="Order"  type="number" {...register('order')} />
        <Input label="Start date" type="date" required {...register('startDate')} />
        <Input label="End date"   type="date" {...register('endDate')} />
      </div>
      <Checkbox label="Current position" hint="Tick if this is your current role" {...register('current')} />
      <Textarea label="Description" rows={3} {...register('description')} />
      <Textarea label="Achievements" rows={4} hint="One per line" {...register('achievements')} />
      <Input label="Tech stack" hint="Comma-separated" {...register('techStack')} />
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-goldDeep/15">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '> save'}</button>
      </div>
    </form>
  );
}
