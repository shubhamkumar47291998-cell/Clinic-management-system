export interface InventoryValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateInventoryItem(data: {
  name: string;
  category: string;
  stockQty: number;
  minStockAlert: number;
  pricePerUnit: number;
}): InventoryValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Item name must be at least 2 characters';
  }

  const validCategories = ['supplies', 'equipment', 'consumables', 'office'];
  if (!data.category || !validCategories.includes(data.category)) {
    errors.category = 'Category must be one of supplies, equipment, consumables, or office';
  }

  if (data.stockQty === undefined || data.stockQty === null || isNaN(data.stockQty)) {
    errors.stockQty = 'Stock quantity is required';
  } else if (data.stockQty < 0 || !Number.isInteger(data.stockQty)) {
    errors.stockQty = 'Stock quantity must be a non-negative integer';
  }

  if (data.minStockAlert === undefined || data.minStockAlert === null || isNaN(data.minStockAlert)) {
    errors.minStockAlert = 'Alert quantity is required';
  } else if (data.minStockAlert < 0 || !Number.isInteger(data.minStockAlert)) {
    errors.minStockAlert = 'Alert quantity must be a non-negative integer';
  }

  if (data.pricePerUnit === undefined || data.pricePerUnit === null || isNaN(data.pricePerUnit)) {
    errors.pricePerUnit = 'Price per unit is required';
  } else if (data.pricePerUnit < 0) {
    errors.pricePerUnit = 'Price per unit must be a non-negative number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateInventoryTransaction(data: {
  transactionType: string;
  quantity: number;
}): InventoryValidationResult {
  const errors: Record<string, string> = {};

  const validTypes = ['in', 'out', 'adjustment'];
  if (!data.transactionType || !validTypes.includes(data.transactionType)) {
    errors.transactionType = 'Transaction type must be in, out, or adjustment';
  }

  if (data.quantity === undefined || data.quantity === null || isNaN(data.quantity)) {
    errors.quantity = 'Quantity is required';
  } else if (data.quantity <= 0 || !Number.isInteger(data.quantity)) {
    errors.quantity = 'Quantity must be a positive integer';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
