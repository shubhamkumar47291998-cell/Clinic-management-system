import React, { useEffect, useState, useCallback } from 'react';
import { Link, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Phone, Calendar, Mail, MapPin, Users, Heart, Shield, Search, MessageSquare, Activity, User, AlertTriangle, ArrowRight, Menu, X, Check, Award as AwardIcon, CreditCard, Lock, QrCode, Hash, FileText } from 'lucide-react';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';

export const getCleanDocName = (name: string): string => {
  let clean = name.trim();
  if (clean.toLowerCase().startsWith('dr.')) {
    clean = clean.substring(3).trim();
  } else if (clean.toLowerCase().startsWith('dr ')) {
    clean = clean.substring(2).trim();
  }
  return `Dr. ${clean}`;
};

export const formatQualifications = (qualifications?: any) => {
  if (!qualifications) return { degrees: '', institution: '', full: '' };
  const arr = Array.isArray(qualifications) ? qualifications : [String(qualifications)];
  const degrees: string[] = [];
  const insts: string[] = [];
  arr.forEach((q: string) => {
    const parts = q.split(' - ');
    if (parts[0]) degrees.push(parts[0].trim());
    if (parts[1] && !insts.includes(parts[1].trim())) insts.push(parts[1].trim());
  });
  const degreesText = degrees.join(', ');
  const instText = insts.join(' & ');
  return {
    degrees: degreesText,
    institution: instText,
    full: instText ? `${degreesText} - ${instText}` : degreesText
  };
};

// Parse doctor schedule arrays to user friendly availability text
export const getAvailabilityText = (schedules?: any[]) => {
  if (!schedules || schedules.length === 0) {
    return 'Mon - Fri (09:00 - 17:00)';
  }
  const active = schedules.filter(s => s.is_active !== false);
  if (active.length === 0) {
    return 'By Appointment Only';
  }
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Array.from(new Set(active.map(s => daysMap[s.day_of_week])));
  const start = active[0].start_time ? active[0].start_time.substring(0, 5) : '09:00';
  const end = active[0].end_time ? active[0].end_time.substring(0, 5) : '17:00';
  return `${days.join(', ')} (${start} - ${end})`;
};

// Floating WhatsApp button component
export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href="https://wa.me/919546650878?text=Hello%20Aura%20Healthcare%20Network,%20I%20would%20like%20to%20inquire%20about%20your%20services."
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        backgroundColor: '#25D366',
        color: '#fff',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 999,
        transition: 'transform 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill="currentColor"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.736.001-2.599-1.011-5.048-2.85-6.892-1.839-1.844-4.283-2.86-6.884-2.861-5.439 0-9.867 4.375-9.87 9.741 0 1.796.488 3.548 1.414 5.093l-.949 3.465 3.57-.922zm11.397-6.241c-.26-.13-1.54-.759-1.777-.846-.237-.087-.41-.13-.58.13-.17.26-.66.846-.81 1.018-.15.172-.3.195-.56.065-.26-.13-1.097-.404-2.09-1.286-.773-.687-1.295-1.537-1.447-1.798-.15-.26-.016-.401.115-.53.118-.117.26-.304.39-.456.13-.15.173-.26.26-.433.087-.173.043-.325-.022-.456-.065-.13-.58-1.387-.795-1.905-.21-.507-.44-.44-.6-.449-.155-.008-.333-.01-.51-.01-.178 0-.468.067-.713.336-.245.268-.936.913-.936 2.227 0 1.314.957 2.583 1.09 2.756.133.173 1.884 2.876 4.564 4.032.637.275 1.135.439 1.524.563.64.203 1.22.174 1.679.106.512-.077 1.54-.63 1.757-1.238.217-.607.217-1.127.152-1.238-.064-.11-.237-.172-.497-.302z" />
      </svg>
    </a>
  );
};

// Main Layout Wrapper
export const PublicWebsite: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Scroll to top on navigation path change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="public-website-theme" style={{ fontFamily: "'Outfit', 'Inter', sans-serif", color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Emergency Header Bar */}
      <div style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', zIndex: 100 }}>
        <AlertTriangle size={16} />
        <span>24/7 EMERGENCY HELPLINE: <strong>+91 99887 76655</strong></span>
      </div>

      {/* Main Glassmorphic Navigation */}
      <header style={{ position: 'sticky', top: 0, zIndex: 90, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Activity size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>AURA</span>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '1px', marginTop: '-3px' }}>HEALTHCARE</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-only-flex">
            <Link to="/" style={{ textDecoration: 'none', color: location.pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Home</Link>
            <Link to="/about" style={{ textDecoration: 'none', color: location.pathname === '/about' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>About Us</Link>
            <Link to="/doctors" style={{ textDecoration: 'none', color: location.pathname === '/doctors' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Doctors</Link>
            <Link to="/departments" style={{ textDecoration: 'none', color: location.pathname === '/departments' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Departments</Link>
            <Link to="/services" style={{ textDecoration: 'none', color: location.pathname === '/services' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Services</Link>
            <Link to="/blog" style={{ textDecoration: 'none', color: location.pathname === '/blog' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Health Blog</Link>
            <Link to="/contact" style={{ textDecoration: 'none', color: location.pathname === '/contact' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Contact</Link>
            <Link to="/emergency" style={{ textDecoration: 'none', color: '#ef4444', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertTriangle size={14} /> Emergency
            </Link>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }} />
            <Link to="/login" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.95rem', marginRight: '0.5rem' }}>Patient Portal Login</Link>
            <Link to="/appointment" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              <Calendar size={16} /> Book Appointment
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            className="mobile-only-block"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-md)', zIndex: 100 }} className="mobile-only-flex">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Home</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>About Us</Link>
            <Link to="/doctors" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Doctors Directory</Link>
            <Link to="/departments" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Departments</Link>
            <Link to="/services" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Services</Link>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Health Blog</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 500 }}>Contact Us</Link>
            <Link to="/emergency" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#ef4444', fontWeight: 600 }}>Emergency Contact 24/7</Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>Patient Portal Login</Link>
            <Link to="/appointment" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{ padding: '0.625rem', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
              Book Online Appointment
            </Link>
          </div>
        )}
      </header>

      {/* Page Content Outlet */}
      <main style={{ flexGrow: 1 }}>
        <Outlet />
      </main>

      {/* Footer Section */}
      <footer className="public-footer" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', padding: '4rem 2rem 2rem 2rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Activity size={20} />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>AURA CLINICS</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              Providing primary and specialized high-quality healthcare services. Bringing trusted medical support closer to you with modern technologies.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Phone size={20} /></a>
              <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Mail size={20} /></a>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.5px' }}>QUICK LINKS</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <li><Link to="/about" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About Aura Network</Link></li>
              <li><Link to="/doctors" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Our Certified Specialists</Link></li>
              <li><Link to="/departments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Medical Departments</Link></li>
              <li><Link to="/services" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Treatments & Programs</Link></li>
              <li><Link to="/blog" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Health & Wellness Blog</Link></li>
              <li><Link to="/emergency" style={{ color: '#ef4444', textDecoration: 'none', fontWeight: 600 }}>Emergency Contact Helpline</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.5px' }}>WORKING HOURS</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Monday - Friday:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>8:00 AM - 8:00 PM</span></li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Saturday:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>9:00 AM - 5:00 PM</span></li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sunday:</span> <span style={{ color: '#ef4444', fontWeight: 600 }}>Emergency Only</span></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.5px' }}>GET IN TOUCH</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <MapPin size={18} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
              Sankhalim, Bicholim Taluk, North Goa, Goa, India - 403505
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Phone size={18} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
              +91 95466 50878
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
              <Mail size={18} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
              support@auraclinics.com
            </p>
          </div>

        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>&copy; {new Date().getFullYear()} Aura Healthcare Network. All Rights Reserved.</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      <WhatsAppButton />
    </div>
  );
};

// Memory cache for specialists list to show them immediately
let cachedHomeDoctors: any[] = [];
try {
  const stored = localStorage.getItem('aura_cached_doctors');
  if (stored) {
    cachedHomeDoctors = JSON.parse(stored);
  }
} catch (e) {}

// ==========================================
// 1. HOME VIEW
// ==========================================
export const PublicHome: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>(cachedHomeDoctors);
  const [loadingDocs, setLoadingDocs] = useState(cachedHomeDoctors.length === 0);

  // Embedded Appointment Booking States
  const clinicId = '11111111-1111-1111-1111-111111111111'; // default AURA clinic
  const [selectedDocId, setSelectedDocId] = useState('');
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  // Booking Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [notes, setNotes] = useState('');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    document.title = "Aura Healthcare Network - Certified Medical Excellence";
    // Add meta description dynamically
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Experience world-class medical consultation, laboratory tests, emergency helplines, and digital health records booking with Aura Clinics.');
    }

    // Generate next 7 days
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setAvailableDays(days);

    const fetchDocs = async () => {
      if (cachedHomeDoctors.length === 0) {
        setLoadingDocs(true);
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, specialization, qualifications, designation, department_id, departments!department_id(name), experience, consultation_fee, profile_image, doctor_schedules(day_of_week, start_time, end_time, is_active)')
          .eq('clinic_id', clinicId)
          .eq('role', 'doctor')
          .eq('is_active', true);
        if (error) throw error;
        if (data) {
          setDoctors(data);
          cachedHomeDoctors = data;
          localStorage.setItem('aura_cached_doctors', JSON.stringify(data));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  // Fetch slots callback
  const fetchSlots = useCallback(async () => {
    if (!selectedDocId || !selectedDateStr) return;
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const weekday = new Date(selectedDateStr).getDay();
      
      const { data: scheds } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, slot_duration_minutes')
        .eq('doctor_id', selectedDocId)
        .eq('is_active', true)
        .eq('day_of_week', weekday);

      if (!scheds || scheds.length === 0) return;
      const daySched = scheds[0];

      const slots: { start: string; end: string }[] = [];
      const [sh, sm] = daySched.start_time.split(':').map(Number);
      const [eh, em] = daySched.end_time.split(':').map(Number);
      const duration = daySched.slot_duration_minutes;

      let current = new Date(selectedDateStr);
      current.setHours(sh, sm, 0, 0);

      const endLimit = new Date(selectedDateStr);
      endLimit.setHours(eh, em, 0, 0);

      while (current.getTime() + duration * 60 * 1000 <= endLimit.getTime()) {
        const next = new Date(current.getTime() + duration * 60 * 1000);
        slots.push({
          start: current.toTimeString().substring(0, 5),
          end: next.toTimeString().substring(0, 5)
        });
        current = next;
      }

      // Check booked
      const startOfDay = `${selectedDateStr}T00:00:00.000Z`;
      const endOfDay = `${selectedDateStr}T23:59:59.999Z`;

      const { data: booked } = await supabase
        .from('appointments')
        .select('slot_start')
        .eq('doctor_id', selectedDocId)
        .eq('status', 'confirmed')
        .gte('slot_start', startOfDay)
        .lte('slot_start', endOfDay);

      const finalSlots = slots.filter((s) => {
        const checkT = new Date(`${selectedDateStr}T${s.start}:00.000Z`).getTime();
        const matchesBooked = (booked || []).some((b) => new Date(b.slot_start).getTime() === checkT);
        return !matchesBooked;
      });

      setAvailableSlots(finalSlots);
    } catch (err) {
      console.error(err);
    }
  }, [selectedDocId, selectedDateStr]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !selectedSlot || !name.trim() || !phone.trim()) {
      setBookingError('Please select a doctor, date, slot and input patient name & contact number.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const startIso = `${selectedDateStr}T${selectedSlot.start}:00.000Z`;
      const endIso = `${selectedDateStr}T${selectedSlot.end}:00.000Z`;

      const { data, error } = await supabase.rpc('book_public_appointment', {
        p_clinic_id: clinicId,
        p_doctor_id: selectedDocId,
        p_patient_name: name.trim(),
        p_patient_phone: phone.trim(),
        p_patient_dob: dob || null,
        p_patient_gender: gender,
        p_slot_start: startIso,
        p_slot_end: endIso,
        p_notes: notes.trim() || null
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      setBookingSuccess(true);
      setName('');
      setPhone('');
      setDob('');
      setNotes('');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete online booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const smoothScrollToBooking = () => {
    const el = document.getElementById('appointment-booking-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* 1. Hero Banner Section */}
      <section style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #e0f2fe 100%)', color: 'var(--text-primary)', padding: '7rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)', padding: '0.375rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              <Shield size={14} /> Certified Apollo-Inspired Network Facility
            </div>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: '1.1', letterSpacing: '-1.5px', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              AURA HEALTHCARE <br /><span style={{ color: 'var(--accent-primary)' }}>Certified Clinical Excellence</span>
            </h1>
            <p style={{ fontSize: '1.15rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
              Experience world-class healthcare solutions at Goa's premier multi-tenant clinic network. On-call ICU units, specialized cardiology wards, and integrated EMR history cards.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <button onClick={smoothScrollToBooking} className="btn btn-primary" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem', fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} /> Book Appointment Now <ArrowRight size={18} />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24/7 Trauma Emergency</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>+91 99887 76655</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Aura Clinical Metrics</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>15,000+</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Happy Recovered Patients</div>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>50+</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Certified Specialists On-Call</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>100%</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Digital Prescription Records Sync</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About Hospital Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>ABOUT OUR FACILITY</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '1.25rem' }}>Pioneering Specialized Primary Healthcare</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Aura Healthcare Networks Bicholim hospital provides high-speed diagnostic and patient checkup workflows. Backed by certified physicians and state-of-the-art EMR records systems, we deliver seamless treatment checkouts and medication dispensations under strict HIPAA regulations.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><Check size={16} style={{ color: 'var(--accent-primary)' }} /> 24/7 Ambulance Fleet</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><Check size={16} style={{ color: 'var(--accent-primary)' }} /> Digital Timeline Audit</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><Check size={16} style={{ color: 'var(--accent-primary)' }} /> Inhouse Pharmacy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><Check size={16} style={{ color: 'var(--accent-primary)' }} /> Advanced Diagnostics</div>
            </div>
          </div>
          <div style={{ padding: '2rem', background: 'var(--bg-primary)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Accredited Certifications</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AwardIcon size={20} /></div>
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>NABH Accredited</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Certified under Indian National Standards for clinical safety.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Shield size={20} /></div>
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>ISO 9001:2015</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quality management certified processes across lab and pharmacy departments.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Doctors Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>MEET OUR SPECIALISTS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem' }}>Certified Doctors Panel</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '1rem auto 0 auto', fontSize: '0.95rem' }}>
              Consult our certified team of experts dynamically pulled from our verified records database.
            </p>
          </div>

          {loadingDocs ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading specialists...</div>
          ) : doctors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No doctors available</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              {doctors.map((doc) => {
                return (
                  <div key={doc.id} className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {doc.profile_image ? (
                        <img src={doc.profile_image} alt={getCleanDocName(doc.name)} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                          <User size={28} />
                        </div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{getCleanDocName(doc.name)}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem', fontWeight: 600 }}>
                          {formatQualifications(doc.qualifications).full || 'MBBS'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block', marginTop: '0.15rem' }}>
                          {doc.designation || 'Consultant Specialist'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div><strong>Qualification:</strong> {formatQualifications(doc.qualifications).full || 'MBBS'}</div>
                      <div><strong>Specialization:</strong> {doc.specialization || 'Internal Medicine'}</div>
                      {doc.experience && (
                        <div><strong>Experience:</strong> {doc.experience} Years</div>
                      )}
                      {doc.consultation_fee && (
                        <div><strong>Consultation Fee:</strong> ₹{doc.consultation_fee}</div>
                      )}
                      <div><strong>Availability:</strong> {getAvailabilityText(doc.doctor_schedules)}</div>
                    </div>
                    <button onClick={smoothScrollToBooking} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none', border: 'none', cursor: 'pointer', marginTop: 'auto' }}>
                      Schedule Visit
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. Services Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>DEPARTMENTS & WARDS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem' }}>Our Healthcare Clinical Services</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}><Shield size={20} /></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>General Medicine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Flu checkups, chronic diabetes monitoring, metabolic panels, and preventive checkups.</p>
            </div>
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><Heart size={20} /></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cardiology</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Hypertension monitors, cardiovascular screenings, ECG logs, and lipid diagnostics.</p>
            </div>
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}><Activity size={20} /></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Orthopedics</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Joint mobility evaluations, ligament injury management, and general bone checkups.</p>
            </div>
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><Users size={20} /></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pediatrics</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Child health immunization planners, nutrition profiling, and basic physical checks.</p>
            </div>
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}><Mail size={20} /></div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Diagnostics</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Advanced blood checks, kidney and liver profiling pathology, thyroid and fever diagnostics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>WHY AURA HOSPITALS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '1.25rem' }}>Uncompromising Medical Standards</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
              We deliver healthcare services based on strict national safety guidelines, providing patients with full access to integrated records on demand.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={18} /></div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>Unified Medical Records (EMR)</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>All prescription sheets, pathology diagnostic files, and checkouts are synced in Supabase instantly.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={18} /></div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>24/7 Cardiac & Trauma Support</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cardiology specialists and critical care support available around the clock.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Patient Testimonials Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>PATIENT FEEDBACK</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem' }}>Healing Experiences</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', color: '#fbbf24', gap: '0.1rem' }}>
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <p style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                "Booking my family slots with Dr. Anisha Natekar was instant. The digital prescriptions generated on the EMR panel are extremely useful."
              </p>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Rahul Sharma</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Panaji, Goa</span>
              </div>
            </div>
            
            <div style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', color: '#fbbf24', gap: '0.1rem' }}>
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <p style={{ fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                "The pathology team is fast. I got my liver screening reports on the patient dashboard in a few hours. Highly recommended."
              </p>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Sneha Naik</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mapusa, Goa</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Appointment Booking Form Section */}
      <section id="appointment-booking-section" style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>DIRECT SCHEDULER</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.5rem' }}>Online Appointment Booking</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Select your preferred date, practitioner, and timing slot to confirm booking immediately.</p>
          </div>

          {bookingSuccess ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}><Check size={32} /></div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Consultation Booked Successfully!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Your slot is scheduled. Please report at our reception lobby 10 minutes prior.</p>
              <button onClick={() => setBookingSuccess(false)} className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem' }}>Book Another Slot</button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
              {bookingError && <div className="alert alert-danger" style={{ gridColumn: 'span 2', marginBottom: '1rem' }}>{bookingError}</div>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Select Specialist Doctor *</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                    required
                  >
                    <option value="">-- Choose practitioner --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {getCleanDocName(d.name)} - {formatQualifications(d.qualifications).degrees || 'MBBS'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Booking Date *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {availableDays.map((d, idx) => {
                      const dateStr = d.toISOString().substring(0, 10);
                      const isSelected = selectedDateStr === dateStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDateStr(dateStr)}
                          style={{
                            padding: '0.5rem 0.25rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-card)',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <strong style={{ fontSize: '0.95rem', marginTop: '0.15rem' }}>{d.getDate()}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Available Consultation Slots</label>
                  {selectedDateStr === '' ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>Choose doctor and date to view slots.</p>
                  ) : availableSlots.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#ef4444', fontStyle: 'italic', marginTop: '0.5rem' }}>No slots available or doctor is off duty.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {availableSlots.map((slot, index) => {
                        const isSelected = selectedSlot?.start === slot.start;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                              color: isSelected ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              textAlign: 'center'
                            }}
                          >
                            {slot.start}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <AuthInput
                  label="Patient Name *"
                  icon={User}
                  type="text"
                  placeholder="Rahul Naik"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={bookingLoading}
                  required
                />

                <AuthInput
                  label="Contact Phone *"
                  icon={Phone}
                  type="tel"
                  placeholder="9546650878"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={bookingLoading}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <AuthInput
                    label="Date of Birth"
                    icon={Calendar}
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={bookingLoading}
                  />

                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                      disabled={bookingLoading}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason for Visit</label>
                  <textarea
                    placeholder="Brief description of symptoms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                    disabled={bookingLoading}
                  />
                </div>

                <AuthButton type="submit" loading={bookingLoading} loadingText="Confirming slot...">
                  Book Online Appointment
                </AuthButton>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 8. Contact Section */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Contact Aura Bicholim-Sankhalim Center</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <MapPin size={20} style={{ color: 'var(--accent-primary)' }} />
                <span>Sankhalim, Bicholim Taluk, North Goa, Goa, India - 403505</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Phone size={20} style={{ color: 'var(--accent-primary)' }} />
                <span>+91 95466 50878</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Mail size={20} style={{ color: 'var(--accent-primary)' }} />
                <span>support@auraclinics.com</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <a
                href="https://maps.google.com/?q=Sankhalim,Goa,India"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                <MapPin size={16} /> Get Directions
              </a>
              
              <a
                href="https://wa.me/919546650878?text=Hello%20Aura%20Healthcare%20Network,%20I%20would%20like%20to%20inquire%20about%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#25D366',
                  borderColor: '#25D366',
                  padding: '0.625rem 1.25rem',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden', height: '320px' }}>
            <iframe
              title="Aura Clinics Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15372.483955610738!2d74.0163351!3d15.5562725!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfa3441bc1ad73%3A0xe44b9eb9a68c07e2!2sSankhalim%2C%20Goa!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// ==========================================
// 2. ABOUT VIEW
// ==========================================
export const PublicAbout: React.FC = () => {
  useEffect(() => {
    document.title = "About Us - Aura Healthcare Clinics";
  }, []);

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>WHO WE ARE</span>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '1.5rem' }}>Pioneering Digital Healthcare Solutions</h1>
      <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Aura Healthcare Network was established with a singular vision: to unify clinic management systems, laboratory checkups, and digital pharmacy dispatch into a seamless user journey. We manage state-of-the-art facilities in North Goa, leveraging modern records models.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AwardIcon size={20} style={{ color: 'var(--accent-primary)' }} /> Certified Quality
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Every consulting specialist on our directory holds MBBS and post-graduate MD degrees with active registrations under respective medical boards.
          </p>
        </div>
        
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Users size={20} style={{ color: 'var(--accent-primary)' }} /> Patient-Centric
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            All medical logs, billing invoices, prescription lists, and medical history cards are dynamically synced in Supabase for 100% HIPAA-compliant audit trails.
          </p>
        </div>
      </div>
    </div>
  );
};
// ==========================================
// 3. DOCTORS DIRECTORY VIEW
// ==========================================
export const PublicDoctors: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>(cachedHomeDoctors);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(cachedHomeDoctors.length === 0);

  // Doctor visual data mock configurations mapping helper
  const getDoctorMeta = (docName: string) => {
    if (docName.includes('Anisha Natekar')) {
      return {
        photo: '/doctor_anisha.png',
        experience: '12+ Years Experience',
        languages: 'English, Hindi, Konkani, Marathi',
        fee: '₹500 Consultation Fee',
        rating: '4.9 Rating',
        treated: '8,000+ Treated',
        address: 'Sankhalim, Goa - 403505',
        phone: '9546650878',
        availability: 'Available Today',
      };
    } else {
      return {
        photo: '/doctor_shubham.png',
        experience: '10+ Years Experience',
        languages: 'English, Hindi, Punjabi',
        fee: '₹800 Consultation Fee',
        rating: '4.8 Rating',
        treated: '5,000+ Treated',
        address: 'Sankhalim, Goa - 403505',
        phone: '9546650878',
        availability: 'Available Today',
      };
    }
  };

  useEffect(() => {
    document.title = "Our Specialized Doctors - Aura Healthcare Clinics";
    
    const fetchDoctors = async () => {
      if (cachedHomeDoctors.length === 0) {
        setLoading(true);
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, specialization, qualifications, designation, department_id, departments!department_id(name), experience, consultation_fee, profile_image, doctor_schedules(day_of_week, start_time, end_time, is_active)')
          .eq('clinic_id', '11111111-1111-1111-1111-111111111111')
          .eq('role', 'doctor')
          .eq('is_active', true);
        if (error) throw error;
        if (data) {
          setDoctors(data);
          cachedHomeDoctors = data;
          localStorage.setItem('aura_cached_doctors', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Error fetching public doctors directory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const filtered = doctors.filter((doc) => {
    const matchSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || 
      (doc.specialization && doc.specialization.toLowerCase().includes(search.toLowerCase()));
    const matchDept = deptFilter === '' || (doc.departments?.name === deptFilter);
    return matchSearch && matchDept;
  });

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '0.85rem' }}>MEET OUR SPECIALISTS</span>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, marginTop: '0.5rem', letterSpacing: '-0.5px' }}>Certified Doctors Directory</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Consult premium practitioners equipped with ISO-certified hospital tools.</p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem', justifyItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search doctors by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', transition: 'var(--transition-smooth)' }}
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All Departments</option>
          <option value="General Medicine">General Medicine</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Pediatrics">Pediatrics</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading specialists...</div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No doctors available</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No doctors found matching filters.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
          {filtered.map((doc) => {
            const meta = getDoctorMeta(doc.name);
            const qual = formatQualifications(doc.qualifications);
            return (
              <div 
                key={doc.id} 
                className="dashboard-card" 
                style={{ 
                  padding: '2rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  borderRadius: '24px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 10px 30px -15px rgba(0,0,0,0.08)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  backgroundColor: 'var(--bg-card)'
                }}
              >
                {/* Doctor Header Block */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <img 
                    src={doc.profile_image || meta.photo} 
                    alt={getCleanDocName(doc.name)} 
                    style={{ width: '84px', height: '84px', borderRadius: '16px', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>{getCleanDocName(doc.name)}</h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>
                      {qual.full || 'MBBS'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block', marginTop: '0.15rem' }}>
                      {doc.designation || 'Senior Consultant'}
                    </span>
                  </div>
                </div>

                {/* Badge tags Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(79, 70, 229, 0.06)', color: 'var(--accent-primary)' }}>
                    ⭐ {meta.rating}
                  </span>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.06)', color: '#059669' }}>
                    🏥 {doc.experience ? `${doc.experience} Years` : meta.experience}
                  </span>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(13, 148, 136, 0.06)', color: '#0d9488' }}>
                    🩺 Specialization: {doc.specialization || 'Internal Medicine'}
                  </span>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(217, 119, 6, 0.06)', color: '#d97706' }}>
                    💰 {doc.consultation_fee ? `₹${doc.consultation_fee}` : meta.fee}
                  </span>
                  <span style={{ padding: '0.25rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
                    🟢 {meta.availability}
                  </span>
                </div>

                {/* Details Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Languages Spoken:</strong> {meta.languages}</div>
                  <div><strong>Total Treated:</strong> {meta.treated}</div>
                  <div><strong>Practice Branch:</strong> {meta.address}</div>
                  <div><strong>Helpline Number:</strong> +91 {meta.phone}</div>
                </div>

                {/* Action Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link 
                    to={`/doctors/${doc.id}`} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.625rem 0', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Profile
                  </Link>
                  <Link 
                    to={`/appointment?doctor_id=${doc.id}`} 
                    className="btn btn-primary" 
                    style={{ padding: '0.625rem 0', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Book Slot
                  </Link>
                  <a 
                    href={`https://wa.me/91${meta.phone}?text=Hello,%20I'd%20like%20to%20consult%20Dr.%20${doc.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.625rem 0', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none', backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. DOCTOR PROFILE VIEW
// ==========================================
export const PublicDoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking form states
  const clinicId = '11111111-1111-1111-1111-111111111111';
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [notes, setNotes] = useState('');

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Doctor static content config selector helper
  const getDoctorStaticProfile = (docName: string) => {
    if (docName.includes('Anisha Natekar')) {
      return {
        photo: '/doctor_anisha.png',
        biography: 'Dr. Anisha Natekar is a senior Consultant Physician specializing in Internal Medicine with over 12 years of clinical experience. She has been actively serving the Goa community, providing thorough diagnosis and patient care plans for chronic disease management, diabetes diagnostics, and cardiovascular wellness counseling.',
        education: [
          'MBBS - Goa Medical College',
          'MD (General Medicine) - Goa Medical College'
        ],
        certifications: [
          'Board Certified Internal Medicine Specialist',
          'Fellowship in Diabetology - MV Hospital for Diabetes Chennai'
        ],
        experience: [
          'Senior Medical Officer - GMC Hospital (2014 - 2018)',
          'Lead Consultant Physician - Aura Health Clinics (2018 - Present)'
        ],
        awards: [
          'Distinguished Service Clinical Award (Goa Health Services, 2022)',
          'Best Preventive Medicine Research Paper (IMA Chapter, 2020)'
        ],
        reviews: [
          { name: 'Rohan Naik', rating: 5, comment: 'Dr. Anisha diagnosed my thyroid issue very accurately. She is extremely knowledgeable and supportive.', date: '2026-06-20' },
          { name: 'Kavita Dessai', rating: 4.9, comment: 'Excellent consultation, spent time explaining lifestyle changes alongside medicines.', date: '2026-05-14' }
        ],
        fee: '₹500',
        treatedCount: '8,000+ Patients',
        mobile: '9546650878',
        address: 'Sankhalim, Goa - 403505'
      };
    } else {
      return {
        photo: '/doctor_shubham.png',
        biography: 'Dr. Shubham Kumar is a highly skilled Cardiologist with over 10 years of experience in diagnosing and treating cardiac disorders. He is dedicated to preventive medicine, coronary monitors management, and heart health rehabilitation.',
        education: [
          'MBBS - AIIMS New Delhi',
          'MD (General Medicine) - AIIMS New Delhi',
          'DM (Cardiology) - PGIMER Chandigarh'
        ],
        certifications: [
          'Fellow of Cardiological Society of India (FCSI)',
          'Advanced Cardiac Life Support (ACLS) Certified Practitioner'
        ],
        experience: [
          'Junior Resident (Cardiology) - PGIMER (2016 - 2019)',
          'Consultant Cardiologist - Aura Health Clinics (2019 - Present)'
        ],
        awards: [
          'Young Cardiologist Award (Cardiological Society of India, 2021)',
          'Excellence in Heart Care Patient Support (Aura Hospital, 2024)'
        ],
        reviews: [
          { name: 'Amit K.', rating: 5, comment: 'Very reassuring doctor. Explained the ECG reports in detail.', date: '2026-06-10' },
          { name: 'Sara M.', rating: 4.8, comment: 'Great experience, professional support staff.', date: '2026-05-18' }
        ],
        fee: '₹800',
        treatedCount: '5,000+ Patients',
        mobile: '9546650878',
        address: 'Sankhalim, Goa - 403505'
      };
    }
  };

  useEffect(() => {
    // Generate next 7 days
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setAvailableDays(days);

    const fetchDoctor = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, specialization, qualifications, designation, department_id, departments!department_id(name), mobile, address, pin_code, experience, consultation_fee, profile_image')
          .eq('id', id)
          .eq('role', 'doctor')
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          throw new Error('Doctor profile not found.');
        }
        setDoctor(data);
        document.title = `Dr. ${data.name} - Profile & Appointment Booking`;
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [id]);

  // Fetch slots callback
  const fetchSlots = useCallback(async () => {
    if (!id || !selectedDateStr) return;
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const weekday = new Date(selectedDateStr).getDay();
      
      const { data: scheds } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, slot_duration_minutes')
        .eq('doctor_id', id)
        .eq('is_active', true)
        .eq('day_of_week', weekday);

      if (!scheds || scheds.length === 0) return;
      const daySched = scheds[0];

      const slots: { start: string; end: string }[] = [];
      const [sh, sm] = daySched.start_time.split(':').map(Number);
      const [eh, em] = daySched.end_time.split(':').map(Number);
      const duration = daySched.slot_duration_minutes;

      let current = new Date(selectedDateStr);
      current.setHours(sh, sm, 0, 0);

      const endLimit = new Date(selectedDateStr);
      endLimit.setHours(eh, em, 0, 0);

      while (current.getTime() + duration * 60 * 1000 <= endLimit.getTime()) {
        const next = new Date(current.getTime() + duration * 60 * 1000);
        slots.push({
          start: current.toTimeString().substring(0, 5),
          end: next.toTimeString().substring(0, 5)
        });
        current = next;
      }

      // Filter already booked slots
      const startOfDay = `${selectedDateStr}T00:00:00.000Z`;
      const endOfDay = `${selectedDateStr}T23:59:59.999Z`;

      const { data: booked } = await supabase
        .from('appointments')
        .select('slot_start')
        .eq('doctor_id', id)
        .eq('status', 'confirmed')
        .gte('slot_start', startOfDay)
        .lte('slot_start', endOfDay);

      const finalSlots = slots.filter((s) => {
        const checkT = new Date(`${selectedDateStr}T${s.start}:00.000Z`).getTime();
        const matchesBooked = (booked || []).some((b) => new Date(b.slot_start).getTime() === checkT);
        return !matchesBooked;
      });

      setAvailableSlots(finalSlots);
    } catch (err) {
      console.error(err);
    }
  }, [id, selectedDateStr]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !name.trim() || !phone.trim()) {
      setBookingError('Please enter slot, patient name and phone number.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const startIso = `${selectedDateStr}T${selectedSlot.start}:00.000Z`;
      const endIso = `${selectedDateStr}T${selectedSlot.end}:00.000Z`;

      // Call postgres transaction safe booking helper (generates invoice & receipt)
      const { data, error } = await supabase.rpc('book_public_appointment', {
        p_clinic_id: clinicId,
        p_doctor_id: id,
        p_patient_name: name.trim(),
        p_patient_phone: phone.trim(),
        p_patient_dob: dob || null,
        p_patient_gender: gender,
        p_slot_start: startIso,
        p_slot_end: endIso,
        p_notes: notes.trim() || null,
        p_payment_mode: 'UPI',
        p_payment_status: 'Paid',
        p_transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        p_amount: 590,
        p_paid_amount: 590,
        p_balance_amount: 0
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      setBookingSuccess(true);
      setName('');
      setPhone('');
      setDob('');
      setNotes('');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to request appointment slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>Loading doctor details...</div>;
  }

  if (!doctor) {
    return (
      <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <h3>Specialist profile not found.</h3>
        <button onClick={() => navigate('/doctors')} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Back to Directory</button>
      </div>
    );
  }

  const profile = getDoctorStaticProfile(doctor.name);
  const docName = getCleanDocName(doctor.name);
  const qual = formatQualifications(doctor.qualifications);

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Breadcrumb */}
      <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link> &gt;{' '}
        <Link to="/doctors" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Doctors</Link> &gt;{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{docName}</span>
      </div>

      {/* Profile Header Banner */}
      <div 
        className="dashboard-card" 
        style={{ 
          padding: '2.5rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '2.5rem', 
          alignItems: 'center', 
          borderRadius: '24px', 
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px -15px rgba(0, 0, 0, 0.08)',
          backgroundColor: 'var(--bg-card)',
          marginBottom: '3rem'
        }}
      >
        <img 
          src={doctor.profile_image || profile.photo} 
          alt={docName} 
          style={{ width: '140px', height: '140px', borderRadius: '24px', objectFit: 'cover', border: '3px solid var(--border-color)' }}
        />
        <div style={{ flexGrow: 1 }}>
          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--accent-primary)' }}>
            {doctor.departments?.name || 'General Medicine'}
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0.5rem 0 0.2rem 0', letterSpacing: '-0.5px' }}>{docName}</h1>
          {/* Qualification — displayed ABOVE designation per requirement */}
          {qual.full && (
            <p style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {qual.full}
            </p>
          )}
          <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {doctor.designation || 'Senior Consultant'}
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Specialization: {doctor.specialization || 'Internal Medicine'}
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div><strong>Consultation Fee:</strong> <span style={{ color: '#0d9488', fontWeight: 700 }}>{doctor.consultation_fee ? `₹${doctor.consultation_fee}` : profile.fee}</span></div>
            <div><strong>Patients Treated:</strong> <span style={{ fontWeight: 600 }}>{profile.treatedCount}</span></div>
            <div><strong>Ratings:</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>⭐ 4.9 (Verified)</span></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '3rem', alignItems: 'start' }}>
        
        {/* Left Column: Rich biography fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Biography */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Biography</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{profile.biography}</p>
          </div>

          {/* Education */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Education & Qualifications</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {profile.education.map((edu, idx) => <li key={idx}>{edu}</li>)}
            </ul>
          </div>

          {/* Certifications */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Certifications</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {profile.certifications.map((cert, idx) => <li key={idx}>{cert}</li>)}
            </ul>
          </div>

          {/* Experience Timeline */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Experience</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {profile.experience.map((exp, idx) => <li key={idx}>{exp}</li>)}
            </ul>
          </div>

          {/* Awards */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Awards & Recognitions</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {profile.awards.map((award, idx) => <li key={idx}>{award}</li>)}
            </ul>
          </div>

          {/* Patient Reviews */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Patient Reviews</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {profile.reviews.map((rev, idx) => (
                <div key={idx} style={{ borderBottom: idx === profile.reviews.length - 1 ? 'none' : '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{rev.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700 }}>⭐ {rev.rating}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Reviewed on {rev.date}</span>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Appointment Booking & Coordinates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '2rem' }}>
          
          {/* Booking slot calendar card */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Availability & Scheduling</h3>
            
            {bookingSuccess ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}><Check size={28} /></div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Slot Confirmed & Invoiced!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Please present your booking record at the clinic front desk.</p>
                <button onClick={() => setBookingSuccess(false)} className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }}>Book Another Appointment</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {bookingError && <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>{bookingError}</div>}
                
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Appointment Date</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {availableDays.map((d, idx) => {
                      const dateStr = d.toISOString().substring(0, 10);
                      const isSelected = selectedDateStr === dateStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDateStr(dateStr)}
                          style={{
                            padding: '0.5rem 0',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ textTransform: 'uppercase', fontSize: '0.65rem', opacity: isSelected ? 0.9 : 0.6 }}>
                            {d.toLocaleDateString(undefined, { weekday: 'short' })}
                          </div>
                          <div style={{ fontSize: '1rem', marginTop: '0.1rem' }}>{d.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDateStr && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Available Time Slot</label>
                    {availableSlots.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0 0 0' }}>No slots open on this date.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {availableSlots.map((slot, index) => {
                          const isSelected = selectedSlot?.start === slot.start;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              style={{
                                padding: '0.5rem 0',
                                borderRadius: '10px',
                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                                color: isSelected ? '#fff' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textAlign: 'center'
                              }}
                            >
                              {slot.start}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <AuthInput
                  label="Patient Full Name *"
                  icon={User}
                  type="text"
                  placeholder="Rahul Naik"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={bookingLoading}
                  required
                />

                <AuthInput
                  label="Contact Mobile *"
                  icon={Phone}
                  type="tel"
                  placeholder="9546650878"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={bookingLoading}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <AuthInput
                    label="Date of Birth"
                    icon={Calendar}
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={bookingLoading}
                  />

                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                      disabled={bookingLoading}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Symptoms / Consultation Notes</label>
                  <textarea
                    placeholder="Brief description of symptoms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                    disabled={bookingLoading}
                  />
                </div>

                <AuthButton type="submit" loading={bookingLoading} loadingText="Confirming slot...">
                  Book Consultation Slot
                </AuthButton>
              </form>
            )}
          </div>

          {/* Contact coordinates mapping card */}
          <div className="dashboard-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Clinic Location</h3>
            <p style={{ display: 'flex', gap: '0.5rem', margin: '0 0 0.75rem 0' }}>
              <MapPin size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span>{profile.address}</span>
            </p>
            <p style={{ display: 'flex', gap: '0.5rem', margin: 0 }}>
              <Phone size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span>Call: +91 {profile.mobile}</span>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

// ==========================================
// 4. DEPARTMENTS VIEW
// ==========================================
export const PublicDepartments: React.FC = () => {
  useEffect(() => {
    document.title = "Departments - Aura Healthcare Clinics";
  }, []);

  const depts = [
    { title: "General Medicine", desc: "Outpatient consults, viral fevers, chronic hypertension, lifestyle screenings, family medicine logs.", icon: Shield },
    { title: "Cardiology", desc: "Coronary monitors, blood pressure audits, heart failure screenings, ECG scans.", icon: Heart },
    { title: "Neurology", desc: "Brain stroke treatments, severe migraine management, nerve pain audits, cognitive tests.", icon: Activity },
    { title: "Pediatrics", desc: "Child wellness checks, infant vaccinations calendars, growth monitoring panels.", icon: Users }
  ];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>OUR MEDICAL WARDS</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>Clinical Departments</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
        {depts.map((d, index) => {
          const IconComp = d.icon;
          return (
            <div key={index} className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                <IconComp size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{d.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{d.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 5. SERVICES VIEW
// ==========================================
export const PublicServices: React.FC = () => {
  useEffect(() => {
    document.title = "Our Services - Aura Healthcare Clinics";
  }, []);

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>HEALTHCARE DELIVERABLES</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>Treatments & Clinical Services</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>01. OPD CONSULT</div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Outpatient Clinics</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              General consultation files, symptom checkups, primary care prescription logs, and digital reports. Available from 8 AM to 8 PM Monday to Saturday.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>02. DIAGNOSTIC LABS</div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Advanced Pathology Reports</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Blood profiling tests, liver and kidney screening diagnostics panels, thyroid tests. Reports are available directly on the patient web portal.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>03. PHARMACY</div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>24/7 Pharmacy Dispensary</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Critical care injectables, cardiac monitors supports, standard antibiotics packages. Inhouse inventory synchronized with billing rates codes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. ONLINE BOOKING VIEW
// ==========================================
export const PublicAppointment: React.FC = () => {
  const clinicId = '11111111-1111-1111-1111-111111111111'; // default AURA clinic

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('doctor_id') || '';
  });
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [doctorSchedules, setDoctorSchedules] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    document.title = "Online Booking - Aura Healthcare Network";
    
    // Fetch doctors
    const fetchDoctors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, specialization')
        .eq('clinic_id', clinicId)
        .eq('role', 'doctor')
        .eq('is_active', true);
      setDoctors(data || []);
    };
    fetchDoctors();
  }, []);

  const [selectedDocDetails, setSelectedDocDetails] = useState<any>(null);
  const [nextAvailableDate, setNextAvailableDate] = useState<string>('');
  const [monthBookings, setMonthBookings] = useState<any[]>([]);
  const [doctorLeaves, setDoctorLeaves] = useState<string[]>([]);

  // Payment method fields states
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [upiId, setUpiId] = useState('');
  const [upiTxnId, setUpiTxnId] = useState('');

  const [netBankingBank, setNetBankingBank] = useState('');

  const [insuranceProvider, setInsuranceProvider] = useState('Star Health');
  const [insurancePolicyNo, setInsurancePolicyNo] = useState('');
  const [insuranceTpaId, setInsuranceTpaId] = useState('');

  useEffect(() => {
    const fetchSchedulesAndDetails = async () => {
      if (!selectedDocId) {
        setDoctorSchedules([]);
        setSelectedDocDetails(null);
        setNextAvailableDate('');
        setDoctorLeaves([]);
        return;
      }
      
      // Fetch schedules
      const { data: scheds } = await supabase
        .from('doctor_schedules')
        .select('day_of_week')
        .eq('doctor_id', selectedDocId)
        .eq('is_active', true);
      const activeScheds = scheds || [];
      setDoctorSchedules(activeScheds);

      // Fetch leaves
      const { data: leaves } = await supabase
        .from('doctor_leaves')
        .select('leave_date')
        .eq('doctor_id', selectedDocId);
      setDoctorLeaves((leaves || []).map(l => l.leave_date));

      // Fetch profile details
      const { data: details } = await supabase
        .from('profiles')
        .select('id, name, specialization, qualifications, designation, departments!department_id(name), experience, consultation_fee, profile_image')
        .eq('id', selectedDocId)
        .single();
      setSelectedDocDetails(details);

      // Calculate next available appointment
      try {
        const today = new Date();
        let foundDate = '';
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date();
          checkDate.setDate(today.getDate() + i);
          const dateStr = checkDate.toISOString().substring(0, 10);
          
          const weekday = checkDate.getDay();
          const isOnDuty = activeScheds.some(s => s.day_of_week === weekday);
          if (isOnDuty) {
            const startOfDay = `${dateStr}T00:00:00.000Z`;
            const endOfDay = `${dateStr}T23:59:59.999Z`;

            const { count } = await supabase
              .from('appointments')
              .select('*', { count: 'exact', head: true })
              .eq('doctor_id', selectedDocId)
              .eq('status', 'confirmed')
              .gte('slot_start', startOfDay)
              .lte('slot_start', endOfDay);

            if ((count || 0) < 16) {
              foundDate = dateStr;
              break;
            }
          }
        }
        if (foundDate) {
          setNextAvailableDate(new Date(foundDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
        } else {
          setNextAvailableDate('None in next 30 days');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchedulesAndDetails();
  }, [selectedDocId]);

  useEffect(() => {
    const fetchMonthBookings = async () => {
      if (!selectedDocId) {
        setMonthBookings([]);
        return;
      }
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data } = await supabase
        .from('appointments')
        .select('slot_start')
        .eq('doctor_id', selectedDocId)
        .eq('status', 'confirmed')
        .gte('slot_start', startOfMonth)
        .lte('slot_start', endOfMonth);
      setMonthBookings(data || []);
    };
    fetchMonthBookings();
  }, [selectedDocId, currentMonth]);

  // Calendar navigators
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    if (!selectedDocId || !selectedDateStr) return;
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const weekday = new Date(selectedDateStr).getDay();
      
      // Get schedule
      const { data: scheds } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, slot_duration_minutes')
        .eq('doctor_id', selectedDocId)
        .eq('is_active', true)
        .eq('day_of_week', weekday);

      if (!scheds || scheds.length === 0) return;
      const daySched = scheds[0];

      const slots: { start: string; end: string }[] = [];
      const [sh, sm] = daySched.start_time.split(':').map(Number);
      const [eh, em] = daySched.end_time.split(':').map(Number);
      const duration = daySched.slot_duration_minutes;

      let current = new Date(selectedDateStr);
      current.setHours(sh, sm, 0, 0);

      const endLimit = new Date(selectedDateStr);
      endLimit.setHours(eh, em, 0, 0);

      while (current.getTime() + duration * 60 * 1000 <= endLimit.getTime()) {
        const next = new Date(current.getTime() + duration * 60 * 1000);
        const startStr = current.toTimeString().substring(0, 5);
        const [h, m] = startStr.split(':').map(Number);
        const timeVal = h + m / 60;
        
        // Skip lunch break: 13:00 (13.0) to 15:00 (15.0)
        if (!(timeVal >= 13 && timeVal < 15)) {
          slots.push({
            start: startStr,
            end: next.toTimeString().substring(0, 5)
          });
        }
        current = next;
      }

      // Check booked
      const startOfDay = `${selectedDateStr}T00:00:00.000Z`;
      const endOfDay = `${selectedDateStr}T23:59:59.999Z`;

      const { data: booked } = await supabase
        .from('appointments')
        .select('slot_start')
        .eq('doctor_id', selectedDocId)
        .eq('status', 'confirmed')
        .gte('slot_start', startOfDay)
        .lte('slot_start', endOfDay);

      const finalSlots = slots.filter((s) => {
        const checkT = new Date(`${selectedDateStr}T${s.start}:00.000Z`).getTime();
        const matchesBooked = (booked || []).some((b) => new Date(b.slot_start).getTime() === checkT);
        return !matchesBooked;
      });

      setAvailableSlots(finalSlots);
    } catch (err) {
      console.error(err);
    }
  }, [selectedDocId, selectedDateStr]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !selectedSlot || !name.trim() || !phone.trim()) {
      setErrorMsg('Please select a doctor, slot and input patient name & contact number.');
      return;
    }

    // 1. Payment Mode validations
    if (paymentMode === 'Credit Card' || paymentMode === 'Debit Card') {
      if (!cardHolder.trim()) { setErrorMsg('Please enter cardholder name.'); return; }
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (!/^\d{16}$/.test(cleanNum)) { setErrorMsg('Please enter a valid 16-digit card number.'); return; }
      if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(cardExpiry)) { setErrorMsg('Please enter a valid expiry date in MM/YY format.'); return; }
      if (!/^\d{3,4}$/.test(cardCvv)) { setErrorMsg('Please enter a valid 3 or 4 digit CVV.'); return; }
    } else if (paymentMode === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) { setErrorMsg('Please enter a valid UPI ID (e.g., name@upi).'); return; }
      if (!/^\d{12}$/.test(upiTxnId)) { setErrorMsg('UPI Transaction ID (UTR) must be exactly 12 digits.'); return; }
    } else if (paymentMode === 'Net Banking') {
      if (!netBankingBank) { setErrorMsg('Please select your retail banking partner.'); return; }
    } else if (paymentMode === 'Insurance') {
      if (!insurancePolicyNo.trim()) { setErrorMsg('Please enter insurance policy number.'); return; }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const startIso = `${selectedDateStr}T${selectedSlot.start}:00.000Z`;
      const endIso = `${selectedDateStr}T${selectedSlot.end}:00.000Z`;

      // Gateway Simulation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      let status = 'Pending';
      let txnId = null;
      let paid = 0;
      let bal = 590;
      
      if (['UPI', 'Credit Card', 'Debit Card', 'Net Banking'].includes(paymentMode)) {
        status = 'Paid';
        txnId = paymentMode === 'UPI' ? upiTxnId : `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        paid = 590;
        bal = 0;
      } else if (paymentMode === 'Insurance') {
        status = 'Insurance Claimed';
        txnId = insurancePolicyNo.trim();
        paid = 0;
        bal = 0;
      } else if (paymentMode === 'Pay Later') {
        status = 'Unpaid';
        paid = 0;
        bal = 590;
      }

      const { data, error } = await supabase.rpc('book_public_appointment', {
        p_clinic_id: clinicId,
        p_doctor_id: selectedDocId,
        p_patient_name: name.trim(),
        p_patient_phone: phone.trim(),
        p_patient_dob: dob || null,
        p_patient_gender: gender,
        p_slot_start: startIso,
        p_slot_end: endIso,
        p_notes: notes.trim() || null,
        p_payment_mode: paymentMode,
        p_payment_status: status,
        p_transaction_id: txnId,
        p_amount: 590,
        p_paid_amount: paid,
        p_balance_amount: bal
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      setSuccessData({
        appointment_id: data.appointment_id,
        patient_id: data.patient_id,
        invoice_id: data.invoice_id,
        invoice_number: data.invoice_number || 'INV-0001',
        receipt_number: data.receipt_number || 'REC-0001',
        patient_name: name.trim(),
        patient_phone: phone.trim(),
        doctor_name: doctors.find(d => d.id === selectedDocId)?.name || 'Dr. Anisha Natekar',
        appointment_date: selectedDateStr,
        appointment_time: selectedSlot?.start,
        payment_mode: paymentMode,
        transaction_id: txnId || 'N/A',
        consultation_fee: 500,
        gst_amount: 90,
        total_amount: 590,
        payment_status: status
      });

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete transaction.');
    } finally {
      setLoading(false);
    }
  };

  if (success && successData) {
    const doc = doctors.find((d) => d.id === selectedDocId);
    
    // Simulate invoice download
    const downloadInvoice = () => {
      const payload = `AURA CLINIC INVOICE STATEMENT\nInvoice #: ${successData.invoice_number}\nDate: ${successData.appointment_date}\nPatient: ${successData.patient_name}\nConsultant: Dr. ${successData.doctor_name}\n\nItem description:\nGeneral Consultation: 500.00 INR\nGST 18.00%: 90.00 INR\nTotal Amount Due: 590.00 INR\nStatus: Paid`;
      const blob = new Blob([payload], { type: 'text/plain' });
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = URL.createObjectURL(blob);
      downloadAnchor.download = `invoice_${successData.invoice_number}.txt`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    // Simulate receipt download
    const downloadReceipt = () => {
      const payload = `AURA CLINIC PAYMENT RECEIPT\nReceipt #: ${successData.receipt_number}\nTransaction ID: ${successData.transaction_id}\nDate: ${successData.appointment_date}\nTime: ${successData.appointment_time}\nPatient: ${successData.patient_name}\nDoctor: Dr. ${successData.doctor_name}\nConsultation Fee: 500.00 INR\nGST 18%: 90.00 INR\nTotal Paid: 590.00 INR\nPayment Mode: ${successData.payment_mode}\nStatus: Confirmed`;
      const blob = new Blob([payload], { type: 'text/plain' });
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = URL.createObjectURL(blob);
      downloadAnchor.download = `receipt_${successData.receipt_number}.txt`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    // WhatsApp Receipt logs to notifications
    const whatsappReceipt = async () => {
      try {
        await supabase.from('notifications').insert({
          clinic_id: clinicId,
          patient_id: successData.patient_id,
          type: 'Receipt Confirmation',
          channel: 'WhatsApp',
          status: 'sent',
          content: `Hi ${successData.patient_name}! Your payment of ₹590 was confirmed. Receipt No: ${successData.receipt_number}. View receipt online: https://aura-hospital.com/receipt/rec-${successData.receipt_number.substring(4)}`
        });
        alert('WhatsApp receipt log updated in Notifications center!');
      } catch (err) {
        console.error(err);
      }
    };

    // Email Receipt
    const emailReceipt = () => {
      alert(`Receipt emailed successfully to patient's contact number: ${successData.patient_phone}`);
    };

    // Print receipt triggers
    const printReceipt = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const html = `
        <html>
        <head>
          <title>Receipt - ${successData.receipt_number}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .totals { border-top: 1px solid #eee; padding-top: 10px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>AURA HEALTH CLINIC - PAYMENT RECEIPT</h2>
            <p>Sankhalim, Goa - 403505 | Mob: 9546650878</p>
          </div>
          <div class="grid">
            <div><strong>Receipt Number:</strong> ${successData.receipt_number}</div>
            <div><strong>Invoice Number:</strong> ${successData.invoice_number}</div>
            <div><strong>Date:</strong> ${new Date(successData.appointment_date).toLocaleDateString()}</div>
            <div><strong>Time:</strong> ${successData.appointment_time}</div>
            <div><strong>Patient Name:</strong> ${successData.patient_name}</div>
            <div><strong>Doctor Name:</strong> Dr. ${successData.doctor_name}</div>
            <div><strong>Payment Mode:</strong> ${successData.payment_mode}</div>
            <div><strong>Transaction ID:</strong> ${successData.transaction_id}</div>
          </div>
          <div class="totals">
            <p>Consultation Fee: ₹500.00</p>
            <p>GST (18.00%): ₹90.00</p>
            <h3>Total Amount Paid: ₹590.00</h3>
            <p><strong>Payment Status:</strong> Confirmed</p>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    };

    return (
      <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Check size={36} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Booking & Payment Successful!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your consultation is confirmed with <strong>Dr. {doc?.name || successData.doctor_name}</strong>. Details of your transaction are below:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Payment Receipt */}
          <div className="dashboard-card" style={{ padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 700 }}>
              Payment Receipt
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Receipt #:</strong> <span>{successData.receipt_number}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Txn ID:</strong> <span>{successData.transaction_id}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Date:</strong> <span>{new Date(successData.appointment_date).toLocaleDateString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Time:</strong> <span>{successData.appointment_time}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Patient:</strong> <span>{successData.patient_name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Doctor:</strong> <span>Dr. {successData.doctor_name}</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Fee:</strong> <span>₹500.00</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>GST (18%):</strong> <span>₹90.00</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                <strong>Total Paid:</strong> <span>₹590.00</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={printReceipt} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Print Receipt</button>
              <button onClick={downloadReceipt} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Download PDF</button>
            </div>
          </div>

          {/* Invoice Statement */}
          <div className="dashboard-card" style={{ padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 700 }}>
              Invoice Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Invoice #:</strong> <span>{successData.invoice_number}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Billing Entity:</strong> <span>Aura Health Clinic</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Address:</strong> <span style={{ textAlign: 'right', fontSize: '0.8rem' }}>Sankhalim, Goa - 403505</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Mobile:</strong> <span>9546650878</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Payment Mode:</strong> <span>{successData.payment_mode}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Status:</strong> <span style={{ color: '#10b981', fontWeight: 600 }}>PAID</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
                <strong>Total Amount:</strong> <span>₹590.00</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={downloadInvoice} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Download Invoice</button>
              <button onClick={whatsappReceipt} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }}>WhatsApp</button>
              <button onClick={emailReceipt} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Email</button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button onClick={() => { setSuccess(false); setSuccessData(null); }} className="btn btn-primary">Book Another Appointment</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>ONLINE CONSULTATION</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>Book Medical Appointment</h1>
      </div>

      {errorMsg && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Select Specialist Doctor *</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
              required
            >
              <option value="">-- Choose practitioner --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {getCleanDocName(d.name)} - {formatQualifications(d.qualifications).degrees || 'MBBS'}
                </option>
              ))}
            </select>
          </div>

          {selectedDocDetails && (
            <div className="dashboard-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-primary)', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selectedDocDetails.profile_image ? (
                  <img src={selectedDocDetails.profile_image} alt={selectedDocDetails.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <User size={24} />
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{getCleanDocName(selectedDocDetails.name)}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '0.15rem' }}>
                    {formatQualifications(selectedDocDetails.qualifications).full || 'MBBS'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{selectedDocDetails.designation || 'Consultant Specialist'}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div><strong>Qualification:</strong> {formatQualifications(selectedDocDetails.qualifications).full || 'MBBS'}
                </div>
                <div><strong>Specialization:</strong> {selectedDocDetails.specialization || 'General Medicine'}</div>
                {selectedDocDetails.experience && (
                  <div><strong>Experience:</strong> {selectedDocDetails.experience} Years</div>
                )}
                {selectedDocDetails.consultation_fee && (
                  <div><strong>Consultation Fee:</strong> ₹{selectedDocDetails.consultation_fee}</div>
                )}
                <div>
                  <strong>Available Days:</strong>{' '}
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {doctorSchedules.length > 0 
                      ? doctorSchedules.map(s => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day_of_week]).join(', ') 
                      : 'Not Scheduled'}
                  </span>
                </div>
                <div><strong>Available Timings:</strong> 09:00 AM - 01:00 PM & 03:00 PM - 07:00 PM</div>
                <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(79, 70, 229, 0.2)', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.75rem', display: 'block' }}>Next Available Appointment:</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{nextAvailableDate || 'Checking slots...'}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Select Date *</label>
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              backgroundColor: 'var(--bg-card)',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  &lt;
                </button>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </strong>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  &gt;
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                {getCalendarDays().map((d, idx) => {
                  if (d === null) {
                    return <div key={idx} />;
                  }

                  const dateStr = d.toISOString().substring(0, 10);
                  const isSelected = selectedDateStr === dateStr;
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = d.getTime() < today.getTime();

                  const weekday = d.getDay();
                  const isOnDuty = doctorSchedules.some(s => s.day_of_week === weekday);
                  const isOffDuty = selectedDocId ? !isOnDuty : false;
                  const isLeave = doctorLeaves.includes(dateStr);

                  const isDisabled = isPast || isOffDuty || isLeave;

                  // Calculate slot capacity & bookings
                  const dateBookings = monthBookings.filter(b => b.slot_start.substring(0, 10) === dateStr);
                  const bookedCount = dateBookings.length;
                  const capacity = 16; // Standard 16 slots per day
                  const remainingSlots = capacity - bookedCount;

                  let statusColor = '#94a3b8'; // Grey (default/off-duty/past)
                  let statusTitle = isLeave ? 'Doctor is on Leave' : 'Doctor is off duty or past date';
                  if (!isDisabled) {
                    if (remainingSlots <= 0) {
                      statusColor = '#ef4444'; // Red (Fully Booked)
                      statusTitle = 'Fully Booked';
                    } else if (remainingSlots < 3) {
                      statusColor = '#f59e0b'; // Yellow (Limited Slots)
                      statusTitle = `${remainingSlots} slots remaining`;
                    } else {
                      statusColor = '#10b981'; // Green (Available)
                      statusTitle = `${remainingSlots} slots available`;
                    }
                  }

                  const isButtonDisabled = isDisabled || remainingSlots <= 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isButtonDisabled}
                      onClick={() => setSelectedDateStr(dateStr)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        backgroundColor: isSelected 
                          ? 'rgba(79, 70, 229, 0.08)' 
                          : isButtonDisabled ? 'transparent' : 'var(--bg-primary)',
                        color: isSelected 
                          ? 'var(--accent-primary)' 
                          : isButtonDisabled ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        opacity: isButtonDisabled ? 0.45 : 1,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        padding: '0'
                      }}
                      title={statusTitle}
                    >
                      <span>{d.getDate()}</span>
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        display: 'block'
                      }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Available Consultation Slots</label>
            {selectedDateStr === '' ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>Select doctor and date to view slots.</p>
            ) : availableSlots.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontStyle: 'italic', marginTop: '0.5rem' }}>No slots available or doctor is off duty.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                {availableSlots.map((slot, index) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: isSelected ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}
                    >
                      {slot.start}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <AuthInput
            label="Patient Name *"
            icon={User}
            type="text"
            placeholder="Rahul Naik"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />

          <AuthInput
            label="Contact Mobile *"
            icon={Phone}
            type="tel"
            placeholder="9546650878"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <AuthInput
              label="Date of Birth"
              icon={Calendar}
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={loading}
            />

            <div className="form-group">
              <label>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                disabled={loading}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Reason for Visit</label>
            <textarea
              placeholder="Brief description of symptoms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
              disabled={loading}
              required
            >
              <option value="UPI">UPI (Online Direct)</option>
              <option value="Credit Card">Credit Card (Online Direct)</option>
              <option value="Debit Card">Debit Card (Online Direct)</option>
              <option value="Net Banking">Net Banking (Online Direct)</option>
              <option value="Cash">Cash (At Clinic Triage)</option>
              <option value="Insurance">Insurance Policy Claim</option>
              <option value="Pay Later">Pay Later (Post Consultation)</option>
            </select>
          </div>

          {/* Credit/Debit Card Fields */}
          {(paymentMode === 'Credit Card' || paymentMode === 'Debit Card') && (
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Secure Card Payment Gateway (₹500 Fee)</strong>
              <AuthInput
                label="Cardholder Name *"
                icon={User}
                type="text"
                placeholder="Rahul Naik"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                disabled={loading}
                required
              />
              <AuthInput
                label="Card Number *"
                icon={CreditCard}
                type="text"
                placeholder="4111 2222 3333 4444"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                maxLength={19}
                disabled={loading}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <AuthInput
                  label="Expiry Date *"
                  icon={Calendar}
                  type="text"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  maxLength={5}
                  disabled={loading}
                  required
                />
                <AuthInput
                  label="CVV *"
                  icon={Lock}
                  type="password"
                  placeholder="***"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  maxLength={4}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          {/* UPI QR and Transaction UTR Code */}
          {paymentMode === 'UPI' && (
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-primary)', alignItems: 'center', textAlign: 'center' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Direct UPI checkout (₹500 Fee)</strong>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px', display: 'inline-block' }}>
                <div style={{ width: '120px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', border: '2px dashed #94a3b8' }}>
                  <QrCode size={48} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Scan QR to Pay</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UPI ID: <strong>pay.aura@hdfcbank</strong></p>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <AuthInput
                  label="Your UPI ID *"
                  icon={User}
                  type="text"
                  placeholder="rahul@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={loading}
                  required
                />
                <div style={{ marginTop: '0.75rem' }} />
                <AuthInput
                  label="Transaction UTR Ref No (12 digits) *"
                  icon={Hash}
                  type="text"
                  placeholder="345678901234"
                  value={upiTxnId}
                  onChange={(e) => setUpiTxnId(e.target.value)}
                  maxLength={12}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          {/* Net Banking Dropdown Selection */}
          {paymentMode === 'Net Banking' && (
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Net Banking checkout (₹500 Fee)</strong>
              <label style={{ fontSize: '0.85rem' }}>Select Bank *</label>
              <select
                value={netBankingBank}
                onChange={(e) => setNetBankingBank(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                disabled={loading}
                required
              >
                <option value="">-- Choose your Bank --</option>
                <option value="SBI">State Bank of India</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="AXIS">Axis Bank</option>
                <option value="PNB">Punjab National Bank</option>
              </select>
            </div>
          )}

          {/* Insurance Provider Form */}
          {paymentMode === 'Insurance' && (
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Insurance Claim Registry</strong>
              <label style={{ fontSize: '0.85rem' }}>Provider Company *</label>
              <select
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                disabled={loading}
              >
                <option value="Star Health">Star Health Insurance</option>
                <option value="HDFC Ergo">HDFC ERGO General</option>
                <option value="ICICI Lombard">ICICI Lombard</option>
                <option value="Niva Bupa">Niva Bupa Health</option>
                <option value="LIC">LIC of India</option>
              </select>
              <div style={{ marginTop: '0.5rem' }} />
              <AuthInput
                label="Insurance Policy No *"
                icon={FileText}
                type="text"
                placeholder="POL-77889922"
                value={insurancePolicyNo}
                onChange={(e) => setInsurancePolicyNo(e.target.value)}
                disabled={loading}
                required
              />
              <AuthInput
                label="TPA Card ID"
                icon={User}
                type="text"
                placeholder="TPA-9988-2922"
                value={insuranceTpaId}
                onChange={(e) => setInsuranceTpaId(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* Pay Later Information Box */}
          {paymentMode === 'Pay Later' && (
            <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>You will be billed ₹500 at the clinic front lobby post consultation. Your slot will be reserved.</span>
            </div>
          )}

          <AuthButton type="submit" loading={loading} loadingText="Scheduling consultation...">
            Book Online Appointment
          </AuthButton>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 7. CONTACT US VIEW
// ==========================================
export const PublicContact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    document.title = "Contact Support - Aura Healthcare Clinics";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg('Please input name, email, and message details.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('inquiries').insert({
        clinic_id: '11111111-1111-1111-1111-111111111111',
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        message: message.trim()
      });

      if (error) throw error;
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit contact inquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>GET IN TOUCH</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>Contact Support</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
        
        {/* Contact Form */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Submit Inquiry</h2>
          
          {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>✓ Inquiry submitted successfully! Our help desk will connect shortly.</div>}
          {errorMsg && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{errorMsg}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AuthInput
              label="Full Name *"
              icon={User}
              type="text"
              placeholder="Sneha Naik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <AuthInput
                label="Email Address *"
                icon={Mail}
                type="email"
                placeholder="sneha@naik.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <AuthInput
                label="Phone Number"
                icon={Phone}
                type="tel"
                placeholder="9546650878"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            <AuthInput
              label="Subject"
              icon={MessageSquare}
              type="text"
              placeholder="Inquiry about lab tests checkups"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />

            <div className="form-group">
              <label>Message Content *</label>
              <textarea
                placeholder="Type your details here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                disabled={loading}
                required
              />
            </div>

            <AuthButton type="submit" loading={loading} loadingText="Submitting details...">
              Send Message
            </AuthButton>
          </form>
        </div>

        {/* Location & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Location Map</h2>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', height: '240px' }}>
              {/* Responsive Google Maps Embed frame */}
              <iframe
                title="Aura Clinics Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15372.483955610738!2d74.0163351!3d15.5562725!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfa3441bc1ad73%3A0xe44b9eb9a68c07e2!2sSankhalim%2C%20Goa!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
              />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Emergency Support</h3>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>Helpline: +91 99887 76655</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Our trauma center is open 24 hours daily with support for ICU transfers.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 8. HEALTH BLOG VIEW
// ==========================================
export const PublicBlog: React.FC = () => {
  useEffect(() => {
    document.title = "Health & Wellness Blog - Aura Healthcare Clinics";
  }, []);

  const posts = [
    { title: "Understanding Hypertension: Symptoms and Preventative Diet", category: "Wellness", readTime: "5 mins read", date: "June 25, 2026", desc: "Learn the primary causes of elevated blood pressure, dietary tips (low sodium, DASH plan), and how tracking logs helps cardiology specialists prescribe medication." },
    { title: "The Importance of Routine Pathology Scans and Lab Profiling", category: "Diagnostics", readTime: "4 mins read", date: "June 20, 2026", desc: "Routine liver, kidney function, and complete blood counts identify micro-nutritional deficits or early infection flags. Learn when you need a test." },
    { title: "Healthy Hearts: Small Cardio Habits That Make Huge Impacts", category: "Cardiology", readTime: "7 mins read", date: "June 15, 2026", desc: "Cardiovascular conditions remain leading healthcare flags. Discover simple aerobic routines, stress mitigation habits, and heart-safe fats diets." }
  ];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>AURA READING LOG</span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' }}>Health & Wellness Blog</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
        {posts.map((p, index) => (
          <div key={index} className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--accent-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{p.category}</span>
              <span>{p.readTime}</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: '1.4' }}>{p.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{p.desc}</p>
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Published: {p.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 9. EMERGENCY CONTACT VIEW
// ==========================================
export const PublicEmergency: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [symptom, setSymptom] = useState('High Fever');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    document.title = "Trauma & Emergency Care - Aura Health Clinic";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Please input name and phone number for emergency check-in.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const clinicId = '11111111-1111-1111-1111-111111111111';
      const doctorId = '22222222-2222-2222-2222-222222222223'; // Dr. Natekar

      // 1. Log Inquiry
      const { error: inquiryErr } = await supabase.from('inquiries').insert({
        clinic_id: clinicId,
        name: name.trim(),
        email: 'emergency@triage.com',
        phone: phone.trim(),
        subject: `EMERGENCY TRIAGE: ${symptom}`,
        message: message.trim() || `Urgent triage alert requested for symptoms: ${symptom}`
      });
      if (inquiryErr) throw inquiryErr;

      // 2. Fetch or create patient profile
      let patientId = '';
      const { data: extPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('phone', phone.trim())
        .limit(1);

      if (extPatient && extPatient.length > 0) {
        patientId = extPatient[0].id;
      } else {
        const { data: newPatient, error: createErr } = await supabase
          .from('patients')
          .insert({
            clinic_id: clinicId,
            name: name.trim(),
            phone: phone.trim(),
            gender: 'Other',
            address: message.trim() || 'Emergency Check-in Location'
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        patientId = newPatient.id;
      }

      // 3. Insert Priority Waitlist Token #1
      const { error: queueErr } = await supabase.from('waiting_queue').insert({
        clinic_id: clinicId,
        doctor_id: doctorId,
        patient_id: patientId,
        token_number: 1,
        is_priority: true,
        status: 'called',
        estimated_wait_minutes: 5
      });
      if (queueErr) throw queueErr;

      // 4. Create Ambulance request log
      const { error: ambulanceErr } = await supabase.from('ambulance_requests').insert({
        clinic_id: clinicId,
        patient_name: name.trim(),
        phone: phone.trim(),
        pickup_address: message.trim() || 'Sankhalim Limits Triage Request'
      });
      if (ambulanceErr) throw ambulanceErr;

      // 5. Simulated notification triggers log
      await supabase.from('notifications').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        type: 'Emergency Alert',
        channel: 'WhatsApp',
        status: 'sent',
        content: `ALERT: Emergency priority ticket generated for ${name}. Ambulance crew dispatched to location. Helpline: +91 99887 76655.`
      });

      setSuccess(true);
      setName('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit triage alert. Call helpline directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem 1.25rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>
          <AlertTriangle size={18} /> 24/7 TRAUMA HELPLINE ACTIVE
        </div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
          Emergency Response Center
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '600px', margin: '0.5rem auto 0 auto' }}>
          If this is a life-threatening scenario, please dial our emergency helpline directly: <strong style={{ color: '#ef4444' }}>+91 99887 76655</strong>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
        
        {/* Left Side: Contact Information & Ambulance dispatch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} /> Call For Immediate Dispatch
            </h3>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-1px' }}>
              +91 99887 76655
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '0.75rem', lineHeight: '1.5' }}>
              Direct line to our Trauma Lobby. A dedicated ICU specialist is on call at all times. Average response time for cardiac units is 12 minutes in Sankhalim limits.
            </p>
          </div>

          <div style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '24px', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Trauma Services Overview</h3>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Activity size={20} /></div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>Cardiac Triage Units</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Equipped with advanced monitoring, defibrillators, and critical meds.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={20} /></div>
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block' }}>On-Call Trauma Surgeons</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specialists in general internal medicine, orthopedic, and cardiovascular surgeries.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Triage form */}
        <div style={{ padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>Direct Reception Check-in Alert</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Submitting this form flags your case on the Front Desk monitor for rapid preparation.
          </p>

          {success && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              ✓ Case registered successfully. Reception crew has been notified. Please report directly to lobby triage.
            </div>
          )}
          {errorMsg && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AuthInput
              label="Patient Name *"
              icon={User}
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />

            <AuthInput
              label="Contact Phone *"
              icon={Phone}
              type="tel"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
            />

            <div className="form-group">
              <label>Primary Symptoms *</label>
              <select
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', marginTop: '0.25rem' }}
                disabled={loading}
              >
                <option value="High Fever">High Fever / Influenza</option>
                <option value="Chest Pain">Chest Pain / Cardiac Signs</option>
                <option value="Breathing Issue">Shortness of Breath</option>
                <option value="Physical Injury">Severe Injury / Fracture</option>
                <option value="Acute Pain">Severe Abdominal Pain</option>
                <option value="Others">Others (Details below)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Additional Symptoms / Details</label>
              <textarea
                placeholder="Describe current condition..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', marginTop: '0.25rem' }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem', backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Alert Reception Crew'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
