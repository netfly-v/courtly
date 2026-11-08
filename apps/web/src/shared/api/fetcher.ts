import type { ApiErrorDto } from './generated/model';

type ApiErrorBody = Omit<ApiErrorDto, 'statusCode'>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDto['details'];

  constructor(status: number, { code, message, details }: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Orval uses it as ErrorType<Body>
export type ErrorType<ErrorBody> = ApiError;

const send = async (url: string, options: RequestInit) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: 'The server could not be reached' });
  }
};

const readErrorBody = (response: Response, text: string): ApiErrorBody => {
  const unexpected = {
    code: 'UNEXPECTED_RESPONSE',
    message: `Unexpected ${response.status} answer`,
  };
  try {
    const body: unknown = JSON.parse(text);
    const isEnvelope = typeof body === 'object' && body !== null && 'code' in body;
    return isEnvelope ? (body as ApiErrorBody) : unexpected;
  } catch {
    return unexpected;
  }
};

export const apiFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const response = await send(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, readErrorBody(response, text));
  }
  return (text ? JSON.parse(text) : undefined) as T;
};
