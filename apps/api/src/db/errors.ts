const UNIQUE_VIOLATION = '23505';
const EXCLUSION_VIOLATION = '23P01';

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === code;
}

export const isUniqueViolation = (error: unknown): boolean => hasCode(error, UNIQUE_VIOLATION);

/** Raised when the calendar exclusion constraints reject an overlapping range. */
export const isExclusionViolation = (error: unknown): boolean =>
  hasCode(error, EXCLUSION_VIOLATION);
