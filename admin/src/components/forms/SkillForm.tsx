'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Checkbox } from '@/components/ui/Field';
import { Skill } from '@/types';

const schema = z.object({
  name:     z.string().min(2),
  category: z.enum(['frontend', 'backend', 'tools', 'design', 'other']),
  level:    z.coerce.number().int().min(0).max(100),
  icon:     z.string().optional(),
  order:    z.coerce.number().int().optional(),
  visible:  z.boolean().optional(),
});

type Values = z.infer<typeof schema>;

export function SkillForm({
  defaultValues, onSubmit, submitting, onCancel,
}: {
  defaultValues?: Partial<Skill>;
  onSubmit: (data: any) => void | Promise<void>;
  submitting?: boolean;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
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

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Name" required {...register('name')} error={errors.name?.message} />
        <Select label="Category" required {...register('category')} options={[
          { value: 'frontend', label: 'frontend' },
          { value: 'backend',  label: 'backend' },
          { value: 'tools',    label: 'tools' },
          { value: 'design',   label: 'design' },
          { value: 'other',    label: 'other' },
        ]} />
        <Input label="Level (0-100)" type="number" min={0} max={100} {...register('level')} error={errors.level?.message} required />
        <Input label="Order" type="number" {...register('order')} />
        <Input label="Icon (optional)" hint="Icon name or URL" {...register('icon')} />
      </div>
      <Checkbox label="Visible in portfolio" {...register('visible')} />
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-goldDeep/15">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '> save'}</button>
      </div>
    </form>
  );
}
