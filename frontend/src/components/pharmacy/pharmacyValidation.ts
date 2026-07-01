export interface PharmacyValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateMedicine(data: {
  name: string;
  expiryDate: string;
  stockQty: number;
  pricePerUnit: number;
}): PharmacyValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Medicine name must be at least 2 characters';
  }

  if (!data.expiryDate) {
    errors.expiryDate = 'Expiry date is required';
  } else {
    const expiry = new Date(data.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expiry.getTime())) {
      errors.expiryDate = 'Invalid date format';
    } else if (expiry <= today) {
      errors.expiryDate = 'Expiry date must be in the future';
    }
  }

  if (data.stockQty === undefined || data.stockQty === null || isNaN(data.stockQty)) {
    errors.stockQty = 'Stock quantity is required';
  } else if (data.stockQty < 0 || !Number.isInteger(data.stockQty)) {
    errors.stockQty = 'Stock quantity must be a non-negative integer';
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

export function validateDispensation(data: {
  patientId: string;
  items: Array<{ medicineId: string; name: string; qty: number; pricePerUnit: number }>;
}): PharmacyValidationResult {
  const errors: Record<string, string> = {};

  if (!data.patientId) {
    errors.patientId = 'Patient selection is required';
  }

  if (!data.items || data.items.length === 0) {
    errors.items = 'At least one medicine must be dispensed';
  } else {
    data.items.forEach((item, index) => {
      if (!item.medicineId) {
        errors[`item_${index}_medicineId`] = 'Medicine ID is required';
      }
      if (item.qty <= 0 || !Number.isInteger(item.qty)) {
        errors[`item_${index}_qty`] = 'Quantity must be a positive integer';
      }
      if (item.pricePerUnit < 0) {
        errors[`item_${index}_price`] = 'Price must be non-negative';
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
