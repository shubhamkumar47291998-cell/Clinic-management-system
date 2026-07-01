import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';
import { AuthAlert } from '../components/auth/AuthAlert';

export const Signup: React.FC = () => {
  const { signUpClinic } = useAuth();
  const navigate = useNavigate();

  // Clinic State
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');

  // Admin State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Validation Errors
  const [clinicNameError, setClinicNameError] = useState('');
  const [clinicPhoneError, setClinicPhoneError] = useState('');
  const [adminNameError, setAdminNameError] = useState('');
  const [adminEmailError, setAdminEmailError] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  // Error/Success State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    let isValid = true;
    setClinicNameError('');
    setClinicPhoneError('');
    setAdminNameError('');
    setAdminEmailError('');
    setAdminPasswordError('');

    if (!clinicName.trim()) {
      setClinicNameError('Clinic name is required');
      isValid = false;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanedClinicPhone = clinicPhone.replace(/[\s-()]/g, '');
    if (!cleanedClinicPhone) {
      setClinicPhoneError('Clinic contact number is required');
      isValid = false;
    } else if (!phoneRegex.test(cleanedClinicPhone) && cleanedClinicPhone.length < 10) {
      setClinicPhoneError('Please enter a valid clinic contact number');
      isValid = false;
    }

    if (!adminName.trim()) {
      setAdminNameError('Admin full name is required');
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail.trim()) {
      setAdminEmailError('Admin email is required');
      isValid = false;
    } else if (!emailRegex.test(adminEmail)) {
      setAdminEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!adminPassword) {
      setAdminPasswordError('Account password is required');
      isValid = false;
    } else if (adminPassword.length < 6) {
      setAdminPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error, clinic } = await signUpClinic(
        clinicName,
        clinicAddress,
        clinicPhone,
        adminName,
        adminEmail,
        adminPassword
      );

      if (error) {
        setErrorMsg(error.message || 'Onboarding failed. Please try again.');
      } else {
        setSuccessMsg(`Onboarded ${clinic.name} successfully! Directing to dashboard...`);
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during signup.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="logo-section">
            <Shield className="logo-icon" size={32} />
            <span className="logo-text">AURA Onboarding</span>
          </div>
          <h2>Clinic Registration</h2>
          <p className="auth-subtitle">Register your clinic and set up the primary administrator account.</p>
        </div>

        <AuthAlert type="danger" message={errorMsg} />
        <AuthAlert type="success" message={successMsg} />

        <form onSubmit={handleSignup} className="auth-form grid-layout" noValidate>
          <div className="section-title" style={{ gridColumn: 'span 2' }}>
            <Building size={16} /> <span>1. Clinic Information</span>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <AuthInput
              label="Clinic Name *"
              icon={Building}
              type="text"
              placeholder="Apex Healthcare Center"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              error={clinicNameError}
              disabled={submitting}
              required
            />
          </div>

          <AuthInput
            label="Clinic Contact Number *"
            icon={Phone}
            type="tel"
            placeholder="+91 99999 88888"
            value={clinicPhone}
            onChange={(e) => setClinicPhone(e.target.value)}
            error={clinicPhoneError}
            disabled={submitting}
            required
          />

          <AuthInput
            label="Clinic Address"
            icon={MapPin}
            type="text"
            placeholder="Sector 5, MG Road, Mumbai"
            value={clinicAddress}
            onChange={(e) => setClinicAddress(e.target.value)}
            disabled={submitting}
          />

          <div className="section-title" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <User size={16} /> <span>2. Administrator Account</span>
          </div>

          <AuthInput
            label="Admin Full Name *"
            icon={User}
            type="text"
            placeholder="Dr. Shubham Kumar"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            error={adminNameError}
            disabled={submitting}
            required
          />

          <AuthInput
            label="Admin Email Address *"
            icon={Mail}
            type="email"
            placeholder="admin@apex.com"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            error={adminEmailError}
            disabled={submitting}
            required
          />

          <div style={{ gridColumn: 'span 2' }}>
            <AuthInput
              label="Account Password *"
              icon={Lock}
              type="password"
              placeholder="Minimum 6 characters"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              error={adminPasswordError}
              disabled={submitting}
              required
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <AuthButton type="submit" loading={submitting} loadingText="Registering Clinic...">
              Register Clinic & Admin
            </AuthButton>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already registered?{' '}
            <Link to="/login" className="text-link">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
