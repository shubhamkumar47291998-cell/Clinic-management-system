export interface StaffValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateStaff(data: {
  name: string;
  email?: string;
  staffType: string;
  phone?: string;
  isEditMode?: boolean;
}): StaffValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Staff name must be at least 2 characters';
  }

  const validTypes = ['receptionist', 'pharmacist', 'lab_technician', 'billing_clerk'];
  if (!data.staffType || !validTypes.includes(data.staffType)) {
    errors.staffType = 'Role type must be receptionist, pharmacist, lab_technician, or billing_clerk';
  }

  if (!data.isEditMode) {
    if (!data.email || data.email.trim().length === 0) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.email = 'Please provide a valid email address';
      }
    }
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
