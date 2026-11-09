import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '@/shared/api/query-client';

// A wrapper, not JSX around the element, so rerender keeps the same client.
export const renderWithClient = (ui: ReactElement, client = createQueryClient()) =>
  render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
