export type UCError = { error: string; statusCode: number; code?: string }

export function ucErr(error: string, statusCode: number, code?: string): UCError {
  return { error, statusCode, code }
}

export function isUCError(v: unknown): v is UCError {
  return typeof v === 'object' && v !== null && 'statusCode' in v && 'error' in v
}
