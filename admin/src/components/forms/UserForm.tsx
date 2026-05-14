'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Checkbox } from '@/components/ui/Field';
import { User } from '@/types';

// Password optional on update
const baseSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(2),
  role:     z.enum(['admin', 'editor']),
  isActive: z.boolean().optional(),
});

const createSchema = baseSchema.extend({ password: z.string().min(6) });
const updateSchema = baseSchema.extend({ password: z.string().min(6).optional().or(z.literal('')) });

type Values = z.infer<typeof createSchema>;

export function UserForm({
  defaultValues, onSubmit, submitting, onCancel, isEdit,
}: {
  defaultValues?: Partial<User>;
  onSubmit: (data: any) => void | Promise<void>;
  submitting?: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      email:    defaultValues?.email ?? '',
      name:     defaultValues?.name ?? '',
      role:     (defaultValues?.role as any) ?? 'editor',
      isActive: defaultValues?.isActive ?? true,
      password: '',
    },
  });

  const internalSubmit = (raw: any) => {
    const payload = { ...raw };
    if (isEdit && !payload.password) delete payload.password;
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)}>
      <Input label="Name"  required {...register('name')}  error={errors.name?.message} />
      <Input label="Email" required type="email" {...register('email')} error={errors.email?.message} />
      <Input label={isEdit ? 'Password (leave blank to keep current)' : 'Password'} type="password"
        required={!isEdit} {...register('password')} error={(errors as any).password?.message} />
      <Select label="Role" {...register('role')} options={[
        { value: 'admin',  label: 'admin' },
        { value: 'editor', label: 'editor' },
      ]} />
      <Checkbox label="Account active" {...register('isActive')} />
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-goldDeep/15">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : '> save'}</button>
      </div>
    </form>
  );
}
