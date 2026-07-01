import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AuthAlertProps {
  message: string;
  type: 'success' | 'danger';
}

export const AuthAlert: React.FC<AuthAlertProps> = ({ message, type }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      {type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
      <span>{message}</span>
    </div>
  );
};
