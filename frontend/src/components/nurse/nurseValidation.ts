export interface NurseValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateNurseAssignment(data: {
  nurseId: string;
  assignedWard: string;
  shift: string;
  startDate: string;
  endDate?: string;
}): NurseValidationResult {
  const errors: Record<string, string> = {};

  if (!data.nurseId || data.nurseId.trim().length === 0) {
    errors.nurseId = 'Nurse selection is required';
  }

  if (!data.assignedWard || data.assignedWard.trim().length < 2) {
    errors.assignedWard = 'Ward name must be at least 2 characters';
  }

  const validShifts = ['morning', 'evening', 'night'];
  if (!data.shift || !validShifts.includes(data.shift)) {
    errors.shift = 'Shift must be morning, evening, or night';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  } else {
    const start = new Date(data.startDate);
    if (isNaN(start.getTime())) {
      errors.startDate = 'Start date must be a valid date';
    }

    if (data.endDate) {
      const end = new Date(data.endDate);
      if (isNaN(end.getTime())) {
        errors.endDate = 'End date must be a valid date';
      } else if (end < start) {
        errors.endDate = 'End date cannot be earlier than start date';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
