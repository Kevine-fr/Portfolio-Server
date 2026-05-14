'use client';
import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  prompt?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, prompt, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card-gold w-full ${sizes[size]} my-8 animate-slide-up shadow-gold-lg`}>
        <div className="flex items-start justify-between p-6 border-b border-goldDeep/15">
          <div>
            {prompt && <p className="console-label mb-1">{`> ${prompt}`}</p>}
            <h3 className="text-xl text-whiteHex font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-goldDeep hover:text-goldGlow text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
