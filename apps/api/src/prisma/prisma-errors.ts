import { Prisma } from '../generated/prisma/client.js';

const isKnownError = (
  error: unknown,
  code: string
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export const isRecordNotFound = (error: unknown) => isKnownError(error, 'P2025');

// Prisma 7 wraps raw Postgres errors in P2039; only the original message names the constraint.
export const violatesConstraint = (error: unknown, constraint: string) => {
  if (!isKnownError(error, 'P2039')) {
    return false;
  }
  const meta = error.meta as { driverAdapterError?: { cause?: { message?: string } } } | undefined;
  return meta?.driverAdapterError?.cause?.message?.includes(`"${constraint}"`) ?? false;
};
