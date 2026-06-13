'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  }));

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          // Respecte les safe-area insets pour ne pas déborder sous la status bar / l'encoche en PWA.
          // En web/desktop les insets valent 0 → comportement par défaut inchangé (24px / 16px).
          offset={{
            top: 'calc(env(safe-area-inset-top, 0px) + 24px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 24px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 24px)',
          }}
          mobileOffset={{
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
          }}
          toastOptions={{ duration: 4000 }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
