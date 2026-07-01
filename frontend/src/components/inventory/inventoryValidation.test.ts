import { describe, it, expect } from 'vitest';
import { validateInventoryItem, validateInventoryTransaction } from './inventoryValidation';

describe('validateInventoryItem', () => {
  it('should pass on valid item details', () => {
    const result = validateInventoryItem({
      name: 'Syringe 5ml',
      category: 'consumables',
      stockQty: 50,
      minStockAlert: 10,
      pricePerUnit: 5.5
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject invalid category or negative stock limits', () => {
    const result = validateInventoryItem({
      name: '',
      category: 'invalid-cat',
      stockQty: -1,
      minStockAlert: -1,
      pricePerUnit: -10
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.category).toBeDefined();
    expect(result.errors.stockQty).toBeDefined();
    expect(result.errors.minStockAlert).toBeDefined();
    expect(result.errors.pricePerUnit).toBeDefined();
  });
});

describe('validateInventoryTransaction', () => {
  it('should pass on valid transaction details', () => {
    const result = validateInventoryTransaction({
      transactionType: 'in',
      quantity: 25
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should reject zero or negative quantities', () => {
    const result = validateInventoryTransaction({
      transactionType: 'out',
      quantity: 0
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.quantity).toBeDefined();
  });
});
