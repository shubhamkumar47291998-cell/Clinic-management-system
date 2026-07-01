export interface ReceptionValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateReceptionLog(data: {
  visitorName: string;
  purpose: string;
  phone?: string;
}): ReceptionValidationResult {
  const errors: Record<string, string> = {};

  if (!data.visitorName || data.visitorName.trim().length < 2) {
    errors.visitorName = 'Visitor name must be at least 2 characters';
  }

  const validPurposes = ['appointment', 'billing_payment', 'report_collection', 'inquiry'];
  if (!data.purpose || !validPurposes.includes(data.purpose)) {
    errors.purpose = 'Purpose must be appointment, billing_payment, report_collection, or inquiry';
  }

  if (data.phone) {
    const phoneClean = data.phone.trim();
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneClean)) {
      errors.phone = 'Phone number must be between 10 and 15 digits';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
