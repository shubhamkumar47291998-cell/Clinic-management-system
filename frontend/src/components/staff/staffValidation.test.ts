import { describe, it, expect } from 'vitest';
import { validateStaff } from './staffValidation';

describe('validateStaff', () => {
  it('should pass on correct staff input', () => {
    const result = validateStaff({
      name: 'Emma Watson',
      email: 'emma@clinic.com',
      staffType: 'receptionist',
      phone: '9876543210'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject empty fields, incorrect email formats, or invalid types', () => {
    const result = validateStaff({
      name: '',
      email: 'emma-watson.com',
      staffType: 'invalid-type',
      phone: '123'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.staffType).toBeDefined();
    expect(result.errors.phone).toBeDefined();
  });
});
