export interface DepartmentValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateDepartment(data: {
  name: string;
  code: string;
  description?: string;
}): DepartmentValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Department name must be at least 2 characters';
  }

  if (!data.code || data.code.trim().length < 2 || data.code.trim().length > 10) {
    errors.code = 'Department code must be between 2 and 10 characters';
  } else {
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!codeRegex.test(data.code.trim())) {
      errors.code = 'Department code must be alphanumeric (letters, numbers, hyphens, underscores)';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
