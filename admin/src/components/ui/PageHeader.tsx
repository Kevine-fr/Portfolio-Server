'use client';
import { ReactNode } from 'react';

interface Props {
  prompt: string;       // e.g. "projects.list"
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ prompt, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-fade-in">
      <div>
        <p className="console-label mb-2">{`> ${prompt}`}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-whiteHex">{title}</h1>
        {subtitle && <p className="mt-2 text-muted text-sm max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
