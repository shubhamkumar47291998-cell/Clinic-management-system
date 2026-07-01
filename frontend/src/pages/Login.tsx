import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Phone, Key, Shield } from 'lucide-react';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthAlert } from '../components/auth/AuthAlert';

export const Login: React.FC = () => {
  const { signInWithEmail, signInWithPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  
  // Validation Errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  // Shared state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateEmailForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const validatePhoneForm = () => {
    setPhoneError('');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 phone format
    const cleanedPhone = phone.replace(/[\s-()]/g, '');

    if (!cleanedPhone) {
      setPhoneError('Phone number is required');
      return false;
    } else if (!phoneRegex.test(cleanedPhone) && cleanedPhone.length < 10) {
      setPhoneError('Please enter a valid phone number (e.g. +91 9876543210)');
      return false;
    }

    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmailForm()) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setErrorMsg(error.message || 'Failed to sign in. Please check your credentials.');
      } else {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhoneForm()) return;

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await signInWithPhone(formattedPhone);
      if (error) {
        setErrorMsg(error.message || 'Failed to send OTP code.');
      } else {
        setOtpSent(true);
        setSuccessMsg('OTP code sent successfully!');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (!otpToken || otpToken.length < 6) {
      setOtpError('Please enter the 6-digit OTP code');
      return;
    }

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await verifyOtp(formattedPhone, otpToken);
      if (error) {
        setErrorMsg(error.message || 'Invalid OTP code. Please try again.');
      } else {
        setSuccessMsg('Phone verified and logged in!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-section">
            <Shield className="logo-icon" size={32} />
            <span className="logo-text">AURA Clinic</span>
          </div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Log in to manage your medical records and appointments.</p>
        </div>

        <AuthAlert type="danger" message={errorMsg} />
        <AuthAlert type="success" message={successMsg} />

        <div className="tab-container">
          <button
            className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('email');
              setErrorMsg('');
              setSuccessMsg('');
              setEmailError('');
              setPasswordError('');
            }}
          >
            Email Login
          </button>
          <button
            className={`tab-btn ${activeTab === 'phone' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('phone');
              setErrorMsg('');
              setSuccessMsg('');
              setPhoneError('');
              setOtpError('');
            }}
          >
            Phone OTP
          </button>
        </div>

        {activeTab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="auth-form" noValidate>
            <AuthInput
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="name@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              disabled={submitting}
              required
            />

            <div className="form-group">
              <div className="flex-justify">
                <label>Password</label>
                <Link to="/forgot-password" className="text-link">
                  Forgot Password?
                </Link>
              </div>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className={passwordError ? 'input-error' : ''}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              {passwordError && <span className="input-help error-text" style={{ color: 'var(--alert-danger-text)' }}>{passwordError}</span>}
            </div>

            <AuthButton type="submit" loading={submitting} loadingText="Signing in...">
              Sign In
            </AuthButton>
          </form>
        ) : (
          <div className="auth-form">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} noValidate>
                <AuthInput
                  label="Phone Number (with Country Code)"
                  icon={Phone}
                  type="tel"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={phoneError}
                  disabled={submitting}
                  required
                />
                <span className="input-help" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem', display: 'block' }}>
                  Include country code, e.g. +91 9876543210
                </span>
                <AuthButton type="submit" loading={submitting} loadingText="Sending code...">
                  Send OTP Code
                </AuthButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} noValidate>
                <AuthInput
                  label="Verification Code"
                  icon={Key}
                  type="text"
                  placeholder="6-Digit OTP"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  error={otpError}
                  disabled={submitting}
                  maxLength={6}
                  required
                />
                <AuthButton type="submit" loading={submitting} loadingText="Verifying OTP...">
                  Verify & Sign In
                </AuthButton>
                <AuthButton
                  type="button"
                  variant="secondary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setOtpSent(false)}
                >
                  Change Phone Number
                </AuthButton>
              </form>
            )}
          </div>
        )}

        <div className="auth-footer">
          <p>
            Onboarding a new clinic?{' '}
            <Link to="/signup" className="text-link">
              Register Clinic Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
