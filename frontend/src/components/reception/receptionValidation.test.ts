import { describe, it, expect } from 'vitest';
import { validateReceptionLog } from './receptionValidation';

describe('validateReceptionLog', () => {
  it('should pass on correct reception log input', () => {
    const result = validateReceptionLog({
      visitorName: 'Alice Smith',
      purpose: 'appointment',
      phone: '9876543210'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject invalid visitor name or invalid purpose', () => {
    const result = validateReceptionLog({
      visitorName: 'A',
      purpose: 'invalid-purpose',
      phone: '123'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.visitorName).toBeDefined();
    expect(result.errors.purpose).toBeDefined();
    expect(result.errors.phone).toBeDefined();
  });
});
