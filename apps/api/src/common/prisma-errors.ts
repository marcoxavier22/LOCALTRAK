export type PrismaKnownRequestError = {
  code: string;
  clientVersion?: string;
  meta?: unknown;
};

export function isPrismaKnownRequestError(error: unknown): error is PrismaKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}
