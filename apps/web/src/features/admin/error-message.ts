import type { ApiError } from '@/shared/api/fetcher';

export const toErrorMessage = (error: ApiError | null) => {
  if (!error) {
    return undefined;
  }
  if (error.status >= 400 && error.status < 500) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};
