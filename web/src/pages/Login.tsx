import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Phone, Key, Shield, AlertCircle } from 'lucide-react';

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
  
  // Shared state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setErrorMsg(error.message || 'Failed to sign in. Please check your credentials.');
      } else {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    // Simple verification: must start with '+' for global E.164, or validate
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      // Assume local formatting - for production standard is E.164 format (e.g. +91)
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
    if (!otpToken) {
      setErrorMsg('Please enter the OTP token.');
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

        {errorMsg && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <span>{successMsg}</span>
          </div>
        )}

        <div className="tab-container">
          <button
            className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('email');
              setErrorMsg('');
              setSuccessMsg('');
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
            }}
          >
            Phone OTP
          </button>
        </div>

        {activeTab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="name@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="auth-form">
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label>Phone Number (with Country Code)</label>
                  <div className="input-with-icon">
                    <Phone className="input-icon" size={18} />
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <span className="input-help">e.g. +91 followed by 10 digit number</span>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? 'Sending code...' : 'Send OTP Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label>Verification Code</label>
                  <div className="input-with-icon">
                    <Key className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="6-Digit OTP"
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? 'Verifying OTP...' : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setOtpSent(false)}
                >
                  Change Phone Number
                </button>
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
