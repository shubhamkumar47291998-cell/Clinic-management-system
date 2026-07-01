import { describe, it, expect } from 'vitest';
import { validateMedicine, validateDispensation } from './pharmacyValidation';

describe('validateMedicine', () => {
  it('should validate normal correct inputs', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = validateMedicine({
      name: 'Paracetamol 500mg',
      expiryDate: dateStr,
      stockQty: 100,
      pricePerUnit: 2.5
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject invalid names, negative prices, and past expiry dates', () => {
    const result = validateMedicine({
      name: '',
      expiryDate: '2020-01-01',
      stockQty: -5,
      pricePerUnit: -10
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.expiryDate).toBe('Expiry date must be in the future');
    expect(result.errors.stockQty).toBe('Stock quantity must be a non-negative integer');
    expect(result.errors.pricePerUnit).toBe('Price per unit must be a non-negative number');
  });
});

describe('validateDispensation', () => {
  it('should validate correct dispensation', () => {
    const result = validateDispensation({
      patientId: 'patient-id-123',
      items: [{ medicineId: 'med-1', name: 'Aspirin', qty: 2, pricePerUnit: 1.5 }]
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject empty item list and invalid items', () => {
    const result = validateDispensation({
      patientId: '',
      items: []
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.patientId).toBeDefined();
    expect(result.errors.items).toBe('At least one medicine must be dispensed');
  });
});
