import React from 'react';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
  block?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  loading = false,
  loadingText = 'Submitting...',
  variant = 'primary',
  block = true,
  ...props
}) => {
  return (
    <button
      {...props}
      className={`btn btn-${variant} ${block ? 'btn-block' : ''}`}
      disabled={loading || props.disabled}
    >
      {loading ? loadingText : children}
    </button>
  );
};
