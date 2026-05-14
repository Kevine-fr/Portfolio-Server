'use client';
import { ReactNode } from 'react';

export function EmptyState({
  icon = '✦',
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-gold p-12 text-center animate-fade-in">
      <div className="text-4xl text-goldGlow/40 mb-4 animate-twinkle">{icon}</div>
      <h3 className="font-mono text-goldPale uppercase tracking-wider text-sm mb-2">{title}</h3>
      {description && <p className="text-muted text-sm mb-6 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
}
