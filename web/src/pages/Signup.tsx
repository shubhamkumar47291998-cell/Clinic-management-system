import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building, User, Mail, Lock, Phone, MapPin, AlertCircle } from 'lucide-react';

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

  // Error/Success State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !clinicName ||
      !clinicPhone ||
      !adminName ||
      !adminEmail ||
      !adminPassword
    ) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
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
        setSuccessMsg(`Onboarded ${clinicName} successfully! Directing to dashboard...`);
        setTimeout(() => navigate('/'), 1500);
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

        <form onSubmit={handleSignup} className="auth-form grid-layout">
          <div className="section-title" style={{ gridColumn: 'span 2' }}>
            <Building size={16} /> <span>1. Clinic Information</span>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Clinic Name *</label>
            <div className="input-with-icon">
              <Building className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Apex Healthcare Center"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Clinic Contact Number *</label>
            <div className="input-with-icon">
              <Phone className="input-icon" size={18} />
              <input
                type="tel"
                placeholder="+91 99999 88888"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Clinic Address</label>
            <div className="input-with-icon">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Sector 5, MG Road, Mumbai"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="section-title" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <User size={16} /> <span>2. Administrator Account</span>
          </div>

          <div className="form-group">
            <label>Admin Full Name *</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Dr. Shubham Kumar"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Admin Email Address *</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                placeholder="admin@apex.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Account Password *</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={submitting}
                minLength={6}
                required
              />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Registering Clinic...' : 'Register Clinic & Admin'}
            </button>
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
