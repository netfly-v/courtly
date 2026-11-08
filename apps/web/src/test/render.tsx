import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createQueryClient } from '@/shared/api/query-client';

export const renderWithClient = (ui: ReactElement, client = createQueryClient()) =>
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
