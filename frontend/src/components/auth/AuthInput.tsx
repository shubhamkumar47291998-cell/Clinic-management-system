import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon: Icon,
  error,
  ...props
}) => {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-with-icon">
        <Icon className="input-icon" size={18} />
        <input {...props} className={error ? 'input-error' : ''} />
      </div>
      {error && <span className="input-help error-text" style={{ color: 'var(--alert-danger-text)' }}>{error}</span>}
    </div>
  );
};
