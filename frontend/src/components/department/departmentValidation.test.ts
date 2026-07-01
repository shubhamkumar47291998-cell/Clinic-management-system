import { describe, it, expect } from 'vitest';
import { validateDepartment } from './departmentValidation';

describe('validateDepartment', () => {
  it('should pass on correct department input', () => {
    const result = validateDepartment({
      name: 'Cardiology',
      code: 'CARD-01',
      description: 'Heart care and surgeries'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject empty or invalid department names and codes', () => {
    const result = validateDepartment({
      name: 'C',
      code: 'C',
      description: 'Too short'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.code).toBeDefined();
  });

  it('should reject department codes with special characters', () => {
    const result = validateDepartment({
      name: 'Pediatrics',
      code: 'PEDI@123'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.code).toContain('alphanumeric');
  });
});
