import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './fetcher';

const shouldRetry = (failureCount: number, error: Error) => {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !isClientError && failureCount < 3;
};

export const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
