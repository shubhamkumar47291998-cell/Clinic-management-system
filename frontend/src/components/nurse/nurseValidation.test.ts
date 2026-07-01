import { describe, it, expect } from 'vitest';
import { validateNurseAssignment } from './nurseValidation';

describe('validateNurseAssignment', () => {
  it('should pass on correct nurse assignment input', () => {
    const result = validateNurseAssignment({
      nurseId: 'nurse-uuid-123',
      assignedWard: 'General Ward A',
      shift: 'morning',
      startDate: '2026-06-26',
      endDate: '2026-07-26'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject invalid or missing fields', () => {
    const result = validateNurseAssignment({
      nurseId: '',
      assignedWard: 'A',
      shift: 'afternoon',
      startDate: 'invalid-date',
      endDate: '2026-06-25' // earlier than startDate if parsed, but startDate is invalid anyway
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.nurseId).toBeDefined();
    expect(result.errors.assignedWard).toBeDefined();
    expect(result.errors.shift).toBeDefined();
    expect(result.errors.startDate).toBeDefined();
  });

  it('should reject if end date is earlier than start date', () => {
    const result = validateNurseAssignment({
      nurseId: 'nurse-uuid-123',
      assignedWard: 'General Ward B',
      shift: 'night',
      startDate: '2026-06-26',
      endDate: '2026-06-25'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toContain('cannot be earlier than start date');
  });
});
