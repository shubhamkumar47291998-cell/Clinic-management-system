import { describe, it, expect } from 'vitest';
import { validatePatient } from './patientValidation';

describe('validatePatient', () => {
  it('should pass on valid input data', () => {
    const result = validatePatient({
      name: 'John Doe',
      phone: '1234567890',
      dob: '1990-05-15',
      gender: 'Male',
      address: '123 Main St'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate name requirements', () => {
    // Empty name
    let result = validatePatient({
      name: '',
      phone: '1234567890',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Name is required');

    // Too short name
    result = validatePatient({
      name: 'A',
      phone: '1234567890',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Name must be at least 2 characters');
  });

  it('should validate phone requirements', () => {
    // Empty phone
    let result = validatePatient({
      name: 'John Doe',
      phone: '',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBe('Phone number is required');

    // Too short phone
    result = validatePatient({
      name: 'John Doe',
      phone: '123456789',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toContain('must be between 10 and 15 digits');

    // Non-numeric characters
    result = validatePatient({
      name: 'John Doe',
      phone: '12345-67890',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toContain('must be between 10 and 15 digits');

    // Valid international phone
    result = validatePatient({
      name: 'John Doe',
      phone: '+123456789012',
      dob: '1990-05-15',
      gender: 'Male'
    });
    expect(result.isValid).toBe(true);
  });

  it('should validate DOB requirements', () => {
    // Empty DOB
    let result = validatePatient({
      name: 'John Doe',
      phone: '1234567890',
      dob: '',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.dob).toBe('Date of birth is required');

    // Future DOB
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    result = validatePatient({
      name: 'John Doe',
      phone: '1234567890',
      dob: tomorrowStr,
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.dob).toBe('Date of birth cannot be in the future');

    // DOB too far in past
    result = validatePatient({
      name: 'John Doe',
      phone: '1234567890',
      dob: '1850-01-01',
      gender: 'Male'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.dob).toBe('Date of birth cannot be more than 125 years ago');
  });

  it('should validate gender requirements', () => {
    // Invalid gender value
    const result = validatePatient({
      name: 'John Doe',
      phone: '1234567890',
      dob: '1990-05-15',
      gender: 'Unknown'
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.gender).toBe('Gender must be Male, Female, or Other');
  });
});
