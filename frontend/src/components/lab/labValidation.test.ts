import { describe, it, expect } from 'vitest';
import { validateLabTest, validateLabRequest } from './labValidation';

describe('validateLabTest', () => {
  it('should pass on correct test info', () => {
    const result = validateLabTest({
      name: 'Complete Blood Count (CBC)',
      code: 'CBC-001',
      price: 350
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject empty fields, negative price, or invalid code symbols', () => {
    const result = validateLabTest({
      name: '',
      code: 'CBC @ 123',
      price: -250
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.code).toBeDefined();
    expect(result.errors.price).toBe('Price must be a non-negative number');
  });
});

describe('validateLabRequest', () => {
  it('should pass on correct IDs', () => {
    const result = validateLabRequest({
      patientId: 'patient-uuid',
      testId: 'test-uuid'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject missing patient or test selection', () => {
    const result = validateLabRequest({
      patientId: '',
      testId: ''
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.patientId).toBeDefined();
    expect(result.errors.testId).toBeDefined();
  });
});
