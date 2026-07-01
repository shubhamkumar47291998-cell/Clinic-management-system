export interface ValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    address?: string;
  };
}

export function validatePatient(data: {
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address?: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  // Phone validation
  const phoneClean = data.phone ? data.phone.trim() : '';
  if (!phoneClean) {
    errors.phone = 'Phone number is required';
  } else {
    // Allows standard phone numbers, optional '+' followed by 10-15 digits
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phoneClean)) {
      errors.phone = 'Phone number must be between 10 and 15 digits (e.g. 9876543210)';
    }
  }

  // DOB validation
  if (!data.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    const dobDate = new Date(data.dob);
    const today = new Date();
    // Reset hours to compare dates only
    today.setHours(23, 59, 59, 999);
    
    if (isNaN(dobDate.getTime())) {
      errors.dob = 'Invalid date format';
    } else if (dobDate > today) {
      errors.dob = 'Date of birth cannot be in the future';
    } else {
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 125);
      if (dobDate < minDate) {
        errors.dob = 'Date of birth cannot be more than 125 years ago';
      }
    }
  }

  // Gender validation
  const validGenders = ['Male', 'Female', 'Other'];
  if (!data.gender) {
    errors.gender = 'Gender is required';
  } else if (!validGenders.includes(data.gender)) {
    errors.gender = 'Gender must be Male, Female, or Other';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
