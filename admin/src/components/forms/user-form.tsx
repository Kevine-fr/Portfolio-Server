'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';

const baseSchema = z.object({
  email:    z.string().email('Email invalide'),
  name:     z.string().min(2),
  role:     z.enum(['admin', 'editor']),
  isActive: z.boolean().optional(),
});
const createSchema = baseSchema.extend({ password: z.string().min(6, 'Au moins 6 caractères') });
const updateSchema = baseSchema.extend({ password: z.string().min(6).optional().or(z.literal('')) });

type Values = z.infer<typeof createSchema>;

export function UserForm({
  defaultValues, onSubmit, submitting, onCancel, isEdit,
}: {
  defaultValues?: Partial<User>;
  onSubmit: (data: any) => unknown | Promise<unknown>;
  submitting?: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      email:    defaultValues?.email ?? '',
      name:     defaultValues?.name ?? '',
      role:     (defaultValues?.role as any) ?? 'editor',
      isActive: defaultValues?.isActive ?? true,
      password: '',
    },
  });

  const role = watch('role');
  const isActive = watch('isActive');

  const internalSubmit = (raw: any) => {
    const payload = { ...raw };
    if (isEdit && !payload.password) delete payload.password;
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
      <FormField label="Nom" required error={errors.name?.message}>
        <Input {...register('name')} />
      </FormField>
      <FormField label="Adresse e-mail" required error={errors.email?.message}>
        <Input type="email" {...register('email')} />
      </FormField>
      <FormField
        label={isEdit ? 'Mot de passe' : 'Mot de passe'}
        required={!isEdit}
        hint={isEdit ? 'Laissez vide pour conserver le mot de passe actuel' : undefined}
        error={(errors as any).password?.message}
      >
        <Input type="password" {...register('password')} />
      </FormField>
      <FormField label="Rôle">
        <Select value={role} onValueChange={(v) => setValue('role', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="editor">Éditeur</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div className="flex items-start gap-3 rounded-md border p-4">
        <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setValue('isActive', !!v)} />
        <label htmlFor="isActive" className="text-sm font-medium leading-none cursor-pointer">
          Compte actif
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
