export interface LabValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateLabTest(data: {
  name: string;
  code: string;
  price: number;
}): LabValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Test name must be at least 2 characters';
  }

  if (!data.code || data.code.trim().length < 2) {
    errors.code = 'Test code must be at least 2 characters';
  } else {
    const codeRegex = /^[A-Z0-9_-]+$/i;
    if (!codeRegex.test(data.code.trim())) {
      errors.code = 'Test code must be alphanumeric (dashes and underscores allowed)';
    }
  }

  if (data.price === undefined || data.price === null || isNaN(data.price)) {
    errors.price = 'Price is required';
  } else if (data.price < 0) {
    errors.price = 'Price must be a non-negative number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateLabRequest(data: {
  patientId: string;
  testId: string;
}): LabValidationResult {
  const errors: Record<string, string> = {};

  if (!data.patientId) {
    errors.patientId = 'Patient selection is required';
  }

  if (!data.testId) {
    errors.testId = 'Test catalog item selection is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
