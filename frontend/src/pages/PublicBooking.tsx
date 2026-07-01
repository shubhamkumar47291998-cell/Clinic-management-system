import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  User, Phone, Calendar, Clock, Check, AlertCircle, Heart, ArrowRight,
  ArrowLeft, CreditCard, Smartphone, Building2, Banknote, Download,
  Printer, ChevronLeft, ChevronRight, FileText, Shield
} from 'lucide-react';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthButton } from '../components/auth/AuthButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicInfo { name: string; address: string; phone: string; }
interface Doctor { id: string; name: string; specialization: string | null; qualifications?: string[] | null; designation?: string | null; }
interface Schedule { day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number; }

type DateStatus = 'available' | 'limited' | 'full' | 'leave' | 'no_schedule' | 'loading' | 'unknown';
type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Net Banking';
type BookingStep = 'slot' | 'patient' | 'payment' | 'success';

interface BookingResult {
  appointment_id: string;
  appointment_number: string;
  patient_id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
}

// ─── Helper: IST-safe date string ────────────────────────────────────────────
// avoids the UTC/IST offset bug: new Date('2026-06-28').getDay() returns Sunday in IST
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getLocalDayOfWeek = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

// Build ISO string treating local date + local time as IST
const buildISTIso = (dateStr: string, timeStr: string): string => {
  // timeStr = "09:15", dateStr = "2026-06-28"
  // We want to represent 09:15 IST = 03:45 UTC
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h, min, 0, 0) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
};

// ─── Luhn algorithm for card validation ───────────────────────────────────────
const isValidLuhn = (num: string): boolean => {
  const digits = num.replace(/\s/g, '').split('').reverse().map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    if (i % 2 === 1) { const doubled = d * 2; sum += doubled > 9 ? doubled - 9 : doubled; }
    else sum += d;
  });
  return sum % 10 === 0;
};

// ─── Receipt print template ───────────────────────────────────────────────────
const printReceipt = (receipt: BookingResult, patientName: string, phone: string, docName: string, date: string, slot: { start: string; end: string }, payMode: string, amount: number, clinicName: string, clinicAddr: string, clinicPhone: string) => {
  const w = window.open('', '_blank', 'width=600,height=800');
  if (!w) return;
  const ist = new Date(buildISTIso(date, slot.start));
  const dateStr = `${String(ist.getDate()).padStart(2,'0')}/${String(ist.getMonth()+1).padStart(2,'0')}/${ist.getFullYear()}`;
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt – ${receipt.receipt_number || receipt.appointment_number}</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;max-width:500px;margin:40px auto;color:#0f172a;font-size:14px}
    .logo{text-align:center;margin-bottom:20px}
    .logo h2{color:#4f46e5;margin:4px 0;font-size:22px}
    .logo p{color:#64748b;font-size:12px;margin:2px 0}
    .badge{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:6px;padding:6px 12px;text-align:center;font-weight:700;margin:12px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    td{padding:7px 4px;border-bottom:1px solid #e2e8f0;font-size:13px}
    td:first-child{color:#64748b;width:45%}
    td:last-child{font-weight:600;text-align:right}
    .total-row td{font-size:15px;font-weight:800;color:#4f46e5;border-bottom:2px solid #4f46e5}
    .footer{text-align:center;color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px dashed #e2e8f0;padding-top:12px}
    @media print{body{margin:0}}
  </style></head><body>
  <div class="logo">
    <h2>&#x2665; ${clinicName}</h2>
    <p>${clinicAddr}</p>
    <p>Tel: ${clinicPhone}</p>
  </div>
  <div class="badge">&#10003; PAYMENT RECEIPT – BOOKING CONFIRMED</div>
  <table>
    <tr><td>Receipt No.</td><td>${receipt.receipt_number || '—'}</td></tr>
    <tr><td>Invoice No.</td><td>${receipt.invoice_number || '—'}</td></tr>
    <tr><td>Appointment No.</td><td>${receipt.appointment_number}</td></tr>
    <tr><td>Patient Name</td><td>${patientName}</td></tr>
    <tr><td>Mobile</td><td>${phone}</td></tr>
    <tr><td>Doctor</td><td>${docName}</td></tr>
    <tr><td>Date</td><td>${dateStr}</td></tr>
    <tr><td>Time Slot</td><td>${slot.start} – ${slot.end}</td></tr>
    <tr><td>Payment Mode</td><td>${payMode}</td></tr>
    <tr><td>Consultation Fee</td><td>₹500.00</td></tr>
    <tr><td>GST @ 18%</td><td>₹${(amount - 500 > 0 ? (amount - 500) : Math.round(500 * 0.18)).toFixed(2)}</td></tr>
    <tr class="total-row"><td>Total Paid</td><td>&#x20B9;${amount.toFixed(2)}</td></tr>
    <tr><td>Payment Status</td><td style="color:#10b981">PAID</td></tr>
  </table>
  <div class="footer">
    <p>Thank you for choosing ${clinicName}.</p>
    <p>This is a computer generated receipt. No signature required.</p>
    <p>For support call: ${clinicPhone}</p>
  </div>
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  w.document.close();
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PublicBooking: React.FC = () => {
  const { clinicId } = useParams<{ clinicId: string }>();

  // ── Clinic & doctor data ──────────────────────────────────────────────────
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // ── Step management ───────────────────────────────────────────────────────
  const [step, setStep] = useState<BookingStep>('slot');

  // ── Slot selection ────────────────────────────────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState('');
  const [doctorSchedules, setDoctorSchedules] = useState<Schedule[]>([]);
  const [doctorLeaves, setDoctorLeaves] = useState<string[]>([]);
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [dateStatuses, setDateStatuses] = useState<Record<string, { status: DateStatus; available: number; total: number }>>({});
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarOffset, setCalendarOffset] = useState(0); // weeks offset

  // ── Patient details ───────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [notes, setNotes] = useState('');

  // ── Payment ───────────────────────────────────────────────────────────────
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [upiId, setUpiId] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [netBankingBank, setNetBankingBank] = useState('SBI');
  const [netBankingRef, setNetBankingRef] = useState('');
  const [payError, setPayError] = useState('');

  // ── Success / Receipt ─────────────────────────────────────────────────────
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const CONSULTATION_AMOUNT = 590; // ₹500 + 18% GST = ₹590

  // ─── Load clinic + doctors ──────────────────────────────────────────────
  const fetchClinicData = useCallback(async () => {
    if (!clinicId) return;
    setLoadingClinic(true);
    try {
      const { data: clinicData, error: clinicErr } = await supabase
        .from('clinics').select('name, address, phone').eq('id', clinicId).single();
      if (clinicErr) throw clinicErr;
      setClinic(clinicData);

      const { data: doctorData } = await supabase
        .from('profiles').select('id, name, specialization, qualifications, designation')
        .eq('clinic_id', clinicId).eq('role', 'doctor').eq('is_active', true);
      setDoctors(doctorData || []);
    } catch (err: any) {
      setGlobalError('Failed to load clinic booking details. Invalid link.');
    } finally {
      setLoadingClinic(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchClinicData(); }, [fetchClinicData]);

  // ─── Build 14-day calendar (2 weeks) ────────────────────────────────────
  useEffect(() => {
    const dates: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + calendarOffset * 14 + i);
      dates.push(d);
    }
    setCalendarDates(dates);
  }, [calendarOffset]);

  // ─── Load doctor schedules + leaves when doctor changes ──────────────────
  useEffect(() => {
    if (!selectedDocId) return;
    const load = async () => {
      try {
        const { data: scheds } = await supabase
          .from('doctor_schedules').select('day_of_week, start_time, end_time, slot_duration_minutes')
          .eq('doctor_id', selectedDocId).eq('is_active', true);
        setDoctorSchedules(scheds || []);

        const { data: leaves } = await supabase
          .from('doctor_leaves').select('leave_date').eq('doctor_id', selectedDocId);
        setDoctorLeaves((leaves || []).map((l: any) => l.leave_date));
      } catch (err) { console.error('Error loading schedules:', err); }
    };
    load();
    setSelectedDateStr('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setDateStatuses({});
  }, [selectedDocId]);

  // ─── Fetch availability status for each calendar date ───────────────────
  useEffect(() => {
    if (!selectedDocId || calendarDates.length === 0) return;
    const fetchStatuses = async () => {
      const updates: Record<string, { status: DateStatus; available: number; total: number }> = {};
      
      // Mark loading state
      calendarDates.forEach(d => {
        const ds = toLocalDateStr(d);
        updates[ds] = { status: 'loading', available: 0, total: 0 };
      });
      setDateStatuses({ ...updates });

      // For each date, compute locally first (fast), then verify with DB
      for (const date of calendarDates) {
        const ds = toLocalDateStr(date);
        const weekday = getLocalDayOfWeek(ds);
        const isLeave = doctorLeaves.includes(ds);
        const sched = doctorSchedules.find(s => s.day_of_week === weekday);

        if (isLeave) {
          updates[ds] = { status: 'leave', available: 0, total: 0 };
          continue;
        }
        if (!sched) {
          updates[ds] = { status: 'no_schedule', available: 0, total: 0 };
          continue;
        }

        // Compute total slots
        const [sh, sm] = sched.start_time.split(':').map(Number);
        const [eh, em] = sched.end_time.split(':').map(Number);
        const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
        const totalSlots = Math.floor(totalMinutes / sched.slot_duration_minutes);

        // Fetch booked count
        try {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', selectedDocId)
            .neq('status', 'cancelled')
            .gte('slot_start', buildISTIso(ds, `${String(sh).padStart(2,'0')}:00`))
            .lte('slot_start', buildISTIso(ds, `${String(eh).padStart(2,'0')}:59`));

          const booked = count || 0;
          const available = Math.max(0, totalSlots - booked);
          let status: DateStatus = 'available';
          if (booked >= totalSlots) status = 'full';
          else if (booked >= totalSlots * 0.75) status = 'limited';
          updates[ds] = { status, available, total: totalSlots };
        } catch {
          updates[ds] = { status: 'available', available: totalSlots, total: totalSlots };
        }
      }
      setDateStatuses({ ...updates });
    };

    fetchStatuses();
  }, [selectedDocId, calendarDates, doctorSchedules, doctorLeaves]);

  // ─── Fetch slots when date is chosen ────────────────────────────────────
  const fetchSlotsForDate = useCallback(async (dateStr: string) => {
    if (!selectedDocId || !dateStr) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const weekday = getLocalDayOfWeek(dateStr);
      const sched = doctorSchedules.find(s => s.day_of_week === weekday);
      if (!sched) { setLoadingSlots(false); return; }

      // Generate all slots
      const slots: { start: string; end: string }[] = [];
      const [sh, sm] = sched.start_time.split(':').map(Number);
      const [eh, em] = sched.end_time.split(':').map(Number);
      const duration = sched.slot_duration_minutes;

      let curH = sh, curM = sm;
      while (curH * 60 + curM + duration <= eh * 60 + em) {
        const nxtTotalMin = curH * 60 + curM + duration;
        const nxtH = Math.floor(nxtTotalMin / 60), nxtM = nxtTotalMin % 60;
        slots.push({
          start: `${String(curH).padStart(2,'0')}:${String(curM).padStart(2,'0')}`,
          end: `${String(nxtH).padStart(2,'0')}:${String(nxtM).padStart(2,'0')}`,
        });
        curH = nxtH; curM = nxtM;
      }

      // Fetch booked slots
      const dayStart = buildISTIso(dateStr, `${String(sh).padStart(2,'0')}:00`);
      const dayEnd = buildISTIso(dateStr, `${String(eh).padStart(2,'0')}:59`);

      const { data: booked } = await supabase
        .from('appointments')
        .select('slot_start')
        .eq('doctor_id', selectedDocId)
        .neq('status', 'cancelled')
        .gte('slot_start', dayStart)
        .lte('slot_start', dayEnd);

      const bookedISOSet = new Set((booked || []).map((b: any) => new Date(b.slot_start).toISOString()));

      const freeSlots = slots.filter(sl => {
        const slotIso = buildISTIso(dateStr, sl.start);
        return !bookedISOSet.has(new Date(slotIso).toISOString());
      });

      setAvailableSlots(freeSlots);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDocId, doctorSchedules]);

  useEffect(() => {
    if (selectedDateStr) fetchSlotsForDate(selectedDateStr);
  }, [selectedDateStr, fetchSlotsForDate]);

  // ─── Payment validation ───────────────────────────────────────────────────
  const validatePayment = (): string | null => {
    if (payMode === 'UPI') {
      if (!upiId.trim()) return 'Please enter your UPI ID.';
      if (!/^[\w.\-]+@[\w]+$/.test(upiId.trim())) return 'Invalid UPI ID format (e.g. name@upi).';
      if (!upiRef.trim()) return 'Please enter the UPI Payment Reference number.';
    }
    if (payMode === 'Card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length < 13 || rawCard.length > 19) return 'Card number must be 13–19 digits.';
      if (!isValidLuhn(rawCard)) return 'Invalid card number. Please check and try again.';
      if (!cardName.trim()) return 'Please enter the card holder name.';
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Expiry format must be MM/YY.';
      const [em, ey] = cardExpiry.split('/').map(Number);
      const now = new Date();
      if (ey + 2000 < now.getFullYear() || (ey + 2000 === now.getFullYear() && em < now.getMonth() + 1)) {
        return 'This card has expired.';
      }
      if (cardCvv.length < 3 || cardCvv.length > 4) return 'CVV must be 3 or 4 digits.';
    }
    if (payMode === 'Net Banking') {
      if (!netBankingRef.trim()) return 'Please enter the Net Banking Transaction Reference.';
    }
    return null;
  };

  // ─── Final booking submit ─────────────────────────────────────────────────
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');

    const err = validatePayment();
    if (err) { setPayError(err); return; }

    setSubmitting(true);
    try {
      const slotStart = buildISTIso(selectedDateStr, selectedSlot!.start);
      const slotEnd = buildISTIso(selectedDateStr, selectedSlot!.end);

      let txnId = '';
      let payDetails: Record<string, string> = {};

      if (payMode === 'UPI') {
        txnId = upiRef.trim();
        payDetails = { upi_id: upiId.trim(), reference: upiRef.trim() };
      } else if (payMode === 'Card') {
        txnId = `CARD-${Date.now()}`;
        payDetails = {
          card_last4: cardNumber.replace(/\s/g, '').slice(-4),
          card_holder: cardName.trim(),
          card_expiry: cardExpiry,
          card_type: 'Credit/Debit',
        };
      } else if (payMode === 'Net Banking') {
        txnId = netBankingRef.trim();
        payDetails = { bank: netBankingBank, reference: netBankingRef.trim() };
      } else {
        // Cash
        txnId = `CASH-${Date.now()}`;
        payDetails = { mode: 'Cash Collected at Reception' };
      }

      const { data, error } = await supabase.rpc('book_public_appointment', {
        p_clinic_id: clinicId,
        p_doctor_id: selectedDocId,
        p_patient_name: patientName.trim(),
        p_patient_phone: patientPhone.trim(),
        p_patient_dob: patientDob || null,
        p_patient_gender: patientGender,
        p_slot_start: slotStart,
        p_slot_end: slotEnd,
        p_notes: notes.trim() || null,
        p_payment_mode: payMode,
        p_payment_status: 'Paid',
        p_transaction_id: txnId,
        p_amount: CONSULTATION_AMOUNT,
        p_paid_amount: CONSULTATION_AMOUNT,
        p_balance_amount: 0,
        p_payment_details: payDetails,
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message || 'Booking failed.');

      setBookingResult(data as BookingResult);
      setStep('success');
    } catch (err: any) {
      setPayError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Date cell styling ───────────────────────────────────────────────────
  const getDateCellStyle = (ds: string, isSelected: boolean): React.CSSProperties => {
    const info = dateStatuses[ds];
    if (!info || info.status === 'loading') return { ...baseDateCellStyle, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', cursor: 'wait', opacity: 0.6 };
    if (info.status === 'no_schedule' || info.status === 'leave')
      return { ...baseDateCellStyle, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'not-allowed', opacity: 0.5 };
    if (info.status === 'full')
      return { ...baseDateCellStyle, backgroundColor: '#fef2f2', border: '1px solid #fecaca', cursor: 'not-allowed', color: '#ef4444' };
    if (isSelected)
      return { ...baseDateCellStyle, backgroundColor: 'var(--accent-primary)', border: '2px solid var(--accent-primary)', color: '#fff', fontWeight: 700 };
    if (info.status === 'limited')
      return { ...baseDateCellStyle, backgroundColor: '#fffbeb', border: '1px solid #fde68a', cursor: 'pointer', color: '#92400e' };
    // available
    return { ...baseDateCellStyle, backgroundColor: '#f0fdf4', border: '1px solid #a7f3d0', cursor: 'pointer', color: '#065f46' };
  };

  const getDateStatusDot = (ds: string) => {
    const info = dateStatuses[ds];
    if (!info) return null;
    const dotColors: Record<string, string> = {
      available: '#22c55e', limited: '#f59e0b', full: '#ef4444', leave: '#94a3b8', no_schedule: '#cbd5e1', loading: '#94a3b8',
    };
    return <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColors[info.status] || '#94a3b8', margin: '2px auto 0' }} />;
  };

  const isDateClickable = (ds: string): boolean => {
    const info = dateStatuses[ds];
    if (!info) return false;
    return info.status !== 'no_schedule' && info.status !== 'leave' && info.status !== 'full' && info.status !== 'loading';
  };

  // ─── Selected doctor display name ────────────────────────────────────────
  const selectedDoc = doctors.find(d => d.id === selectedDocId);
  const rawDocName = selectedDoc?.name?.trim() ?? '';
  const docDisplayName = selectedDoc
    ? (rawDocName.toLowerCase().startsWith('dr.') || rawDocName.toLowerCase().startsWith('dr ')
        ? rawDocName
        : `Dr. ${rawDocName}`)
    : '';

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loadingClinic) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Heart size={40} color="#4f46e5" style={{ marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
          <p>Loading booking portal…</p>
        </div>
      </div>
    );
  }

  if (globalError) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h3>{globalError}</h3>
        </div>
      </div>
    );
  }

  // ─── SUCCESS screen ──────────────────────────────────────────────────────
  if (step === 'success' && bookingResult) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, maxWidth: '560px', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', padding: '2rem 2rem 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 0 8px #d1fae5' }}>
              <Check size={36} color="#10b981" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, color: '#065f46' }}>Booking Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
              Your appointment has been registered successfully.
            </p>
          </div>

          {/* Receipt Card */}
          <div style={{ margin: '1.75rem 2rem', backgroundColor: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '1rem 1.5rem', color: '#fff' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Receipt</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem' }}>{clinic?.name}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.1rem' }}>{clinic?.address}</div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {[
                { label: 'Appointment No.', value: bookingResult.appointment_number },
                { label: 'Receipt No.', value: bookingResult.receipt_number || '—' },
                { label: 'Invoice No.', value: bookingResult.invoice_number || '—' },
                { label: 'Patient', value: patientName },
                { label: 'Mobile', value: patientPhone },
                { label: 'Doctor', value: docDisplayName },
                { label: 'Date', value: new Date(getLocalDayOfWeek(selectedDateStr) ? selectedDateStr : selectedDateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Time Slot', value: `${selectedSlot?.start} – ${selectedSlot?.end}` },
                { label: 'Payment Mode', value: payMode },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.87rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0', fontSize: '1rem', fontWeight: 800 }}>
                <span>Total Paid</span>
                <span style={{ color: '#4f46e5', fontSize: '1.15rem' }}>₹{CONSULTATION_AMOUNT.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                (Consultation ₹500.00 + GST ₹90.00)
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ padding: '0 2rem 2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => printReceipt(bookingResult, patientName, patientPhone, docDisplayName, selectedDateStr, selectedSlot!, payMode, CONSULTATION_AMOUNT, clinic?.name || 'Aura Health', clinic?.address || 'Sankhalim, Goa', clinic?.phone || '9546650878')}
              style={{ flex: 1, minWidth: '130px', padding: '0.7rem', borderRadius: '12px', border: '1px solid var(--accent-primary)', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.87rem' }}
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => printReceipt(bookingResult, patientName, patientPhone, docDisplayName, selectedDateStr, selectedSlot!, payMode, CONSULTATION_AMOUNT, clinic?.name || 'Aura Health', clinic?.address || 'Sankhalim, Goa', clinic?.phone || '9546650878')}
              style={{ flex: 1, minWidth: '130px', padding: '0.7rem', borderRadius: '12px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.87rem' }}
            >
              <Download size={16} /> Download PDF
            </button>
            <a
              href={`https://wa.me/91${clinic?.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Appointment confirmed!\nAppt No: ${bookingResult.appointment_number}\nReceipt: ${bookingResult.receipt_number || '—'}\nDoctor: ${docDisplayName}\nDate: ${selectedDateStr}\nTime: ${selectedSlot?.start}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, minWidth: '130px', padding: '0.7rem', borderRadius: '12px', backgroundColor: '#25D366', color: '#fff', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.87rem' }}
            >
              WhatsApp
            </a>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', paddingBottom: '1.5rem' }}>
            Please show this receipt at the clinic reception.
          </p>
        </div>
      </div>
    );
  }

  // ─── STEP INDICATOR ──────────────────────────────────────────────────────
  const steps = [
    { key: 'slot', label: 'Choose Slot', num: 1 },
    { key: 'patient', label: 'Your Details', num: 2 },
    { key: 'payment', label: 'Payment', num: 3 },
  ];

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, maxWidth: '820px', width: '100%' }}>

        {/* Clinic Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', borderRadius: '20px 20px 0 0', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={22} color="#c7d2fe" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>{clinic?.name}</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>{clinic?.address} · {clinic?.phone}</p>
          </div>
          <div style={{ marginLeft: 'auto', padding: '0.3rem 0.75rem', borderRadius: '50px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700 }}>
            🟢 Online Booking Open
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
                  backgroundColor: step === s.key ? '#4f46e5' : (steps.findIndex(x => x.key === step) > i ? '#22c55e' : 'var(--bg-primary)'),
                  color: (step === s.key || steps.findIndex(x => x.key === step) > i) ? '#fff' : 'var(--text-muted)',
                  border: step === s.key ? '2px solid #4f46e5' : (steps.findIndex(x => x.key === step) > i ? '2px solid #22c55e' : '2px solid var(--border-color)'),
                }}>
                  {steps.findIndex(x => x.key === step) > i ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: step === s.key ? 700 : 500, color: step === s.key ? 'var(--accent-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: '40px', height: '2px', backgroundColor: steps.findIndex(x => x.key === step) > i ? '#22c55e' : 'var(--border-color)', margin: '0 0.5rem', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>

          {/* ─── STEP 1: SLOT SELECTION ────────────────────────────────────── */}
          {step === 'slot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Select Doctor & Appointment Slot</h2>

              {/* Doctor Select */}
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Consulting Doctor *</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => { setSelectedDocId(e.target.value); setSelectedDateStr(''); setSelectedSlot(null); setCalendarOffset(0); }}
                  style={selectStyle}
                  required
                >
                  <option value="">— Choose a Specialist —</option>
                  {doctors.map((d) => {
                    const rawName = d.name.trim();
                    const cleanName = rawName.toLowerCase().startsWith('dr.') || rawName.toLowerCase().startsWith('dr ') ? rawName : `Dr. ${rawName}`;
                    const quals = Array.isArray(d.qualifications)
                      ? d.qualifications.map((q: string) => q.split(' - ')[0]).join(', ')
                      : d.qualifications
                        ? String(d.qualifications).split(' - ')[0]
                        : 'MBBS';
                    return (
                      <option key={d.id} value={d.id}>
                        {cleanName} - {quals}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Calendar legend */}
              {selectedDocId && (
                <>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {[
                      { color: '#22c55e', label: 'Available' },
                      { color: '#f59e0b', label: 'Limited Slots' },
                      { color: '#ef4444', label: 'Fully Booked' },
                      { color: '#94a3b8', label: 'Unavailable / Leave' },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Smart Calendar */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Appointment Date *</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => setCalendarOffset(o => Math.max(0, o - 1))} disabled={calendarOffset === 0} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: calendarOffset === 0 ? 'not-allowed' : 'pointer', opacity: calendarOffset === 0 ? 0.4 : 1 }}>
                          <ChevronLeft size={16} />
                        </button>
                        <button type="button" onClick={() => setCalendarOffset(o => o + 1)} style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', paddingBottom: '0.4rem', textTransform: 'uppercase' }}>{d}</div>
                      ))}
                      {calendarDates.map((date) => {
                        const ds = toLocalDateStr(date);
                        const isSelected = selectedDateStr === ds;
                        const clickable = isDateClickable(ds);
                        const info = dateStatuses[ds];
                        const isPast = date < new Date(new Date().setHours(0,0,0,0));

                        if (isPast) {
                          return (
                            <div key={ds} style={{ ...baseDateCellStyle, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', cursor: 'not-allowed', opacity: 0.3, gridColumn: date === calendarDates[0] ? `${date.getDay() + 1}` : 'auto' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{date.getDate()}</span>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={ds}
                            type="button"
                            disabled={!clickable}
                            onClick={() => { if (clickable) { setSelectedDateStr(ds); setSelectedSlot(null); } }}
                            style={{
                              ...getDateCellStyle(ds, isSelected),
                              gridColumn: date === calendarDates[0] ? `${date.getDay() + 1}` : 'auto',
                            }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{date.getDate()}</span>
                            {getDateStatusDot(ds)}
                            {info && info.status !== 'no_schedule' && info.status !== 'leave' && info.status !== 'loading' && (
                              <span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.8 }}>
                                {info.status === 'full' ? 'Full' : `${info.available}✓`}
                              </span>
                            )}
                            {info?.status === 'leave' && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#94a3b8' }}>Leave</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDateStr && (
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Available Time Slots for {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} *
                      </label>
                      {loadingSlots ? (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem', fontSize: '0.875rem' }}>Searching available slots…</p>
                      ) : availableSlots.length === 0 ? (
                        <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '0.875rem', color: '#991b1b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <AlertCircle size={16} /> No available slots on this date. Please choose another date.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
                          {availableSlots.map((slot) => {
                            const isSel = selectedSlot?.start === slot.start;
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                style={{
                                  padding: '0.6rem 0.4rem',
                                  borderRadius: '10px',
                                  border: isSel ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                  backgroundColor: isSel ? 'var(--accent-primary)' : 'var(--bg-card)',
                                  color: isSel ? '#fff' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontWeight: isSel ? 700 : 500,
                                  fontSize: '0.82rem',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                  transition: 'var(--transition-smooth)',
                                }}
                              >
                                <Clock size={12} /> {slot.start}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep('patient')}
                  style={{ ...primaryBtnStyle, opacity: !selectedSlot ? 0.5 : 1, cursor: !selectedSlot ? 'not-allowed' : 'pointer' }}
                >
                  Continue to Patient Details <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: PATIENT DETAILS ────────────────────────────────────── */}
          {step === 'patient' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Your Details</h2>
                <div style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                  {docDisplayName} · {selectedSlot?.start} – {selectedSlot?.end}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <AuthInput label="Full Name *" icon={User} type="text" placeholder="Jane Doe" value={patientName} onChange={e => setPatientName(e.target.value)} required />
                <AuthInput label="Mobile Number *" icon={Phone} type="tel" placeholder="+91 99999 88888" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} required />
                <AuthInput label="Date of Birth" icon={Calendar} type="date" value={patientDob} onChange={e => setPatientDob(e.target.value)} />
                <div className="form-group">
                  <label>Gender</label>
                  <select value={patientGender} onChange={e => setPatientGender(e.target.value)} style={selectStyle}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Reason for Visit / Symptoms</label>
                <textarea placeholder="Describe your symptoms (optional)…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={textareaStyle} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setStep('slot')} style={secondaryBtnStyle}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  disabled={!patientName.trim() || !patientPhone.trim()}
                  onClick={() => setStep('payment')}
                  style={{ ...primaryBtnStyle, opacity: (!patientName.trim() || !patientPhone.trim()) ? 0.5 : 1, cursor: (!patientName.trim() || !patientPhone.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  Proceed to Payment <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: PAYMENT ────────────────────────────────────────────── */}
          {step === 'payment' && (
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Payment</h2>
                <div style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.85rem', fontWeight: 700 }}>
                  Total: ₹{CONSULTATION_AMOUNT} (incl. GST)
                </div>
              </div>

              {/* Booking summary */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '1.1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Doctor</span><br /><strong>{docDisplayName}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Date</span><br /><strong>{selectedDateStr}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Slot</span><br /><strong>{selectedSlot?.start} – {selectedSlot?.end}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Patient</span><br /><strong>{patientName}</strong></div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Fees</span>
                  <div style={{ fontWeight: 700 }}>₹500 + 18% GST = <span style={{ color: '#4f46e5' }}>₹590</span></div>
                </div>
              </div>

              {payError && (
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> {payError}
                </div>
              )}

              {/* Payment mode selector */}
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Payment Method *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {([
                    { mode: 'UPI' as PaymentMode, icon: Smartphone, label: 'UPI', sub: 'GPay, PhonePe, Paytm' },
                    { mode: 'Card' as PaymentMode, icon: CreditCard, label: 'Card', sub: 'Credit / Debit Card' },
                    { mode: 'Net Banking' as PaymentMode, icon: Building2, label: 'Net Banking', sub: 'NEFT / RTGS / IMPS' },
                    { mode: 'Cash' as PaymentMode, icon: Banknote, label: 'Cash', sub: 'Pay at Reception' },
                  ]).map(({ mode, icon: Icon, label, sub }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setPayMode(mode); setPayError(''); }}
                      style={{
                        padding: '1rem', borderRadius: '14px',
                        border: payMode === mode ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: payMode === mode ? 'var(--accent-light)' : 'var(--bg-card)',
                        cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center',
                        transition: 'var(--transition-smooth)',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: payMode === mode ? 'var(--accent-primary)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} color={payMode === mode ? '#fff' : 'var(--text-muted)'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: payMode === mode ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI Fields */}
              {payMode === 'UPI' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smartphone size={16} /> UPI Payment Details
                  </div>
                  <AuthInput label="UPI ID *" icon={Smartphone} type="text" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} required />
                  <div style={{ padding: '0.85rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '0.82rem', color: '#92400e' }}>
                    📲 <strong>Steps:</strong> Open GPay/PhonePe → Send ₹590 to UPI: <strong>9546650878@upi</strong> → Enter the transaction reference below.
                  </div>
                  <AuthInput label="UPI Payment Reference / UTR *" icon={FileText} type="text" placeholder="e.g. 412345678901" value={upiRef} onChange={e => setUpiRef(e.target.value)} required />
                </div>
              )}

              {/* Card Fields */}
              {payMode === 'Card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={16} /> Card Details
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Card Number *</label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').substring(0, 16);
                        setCardNumber(raw.replace(/(.{4})/g, '$1 ').trim());
                      }}
                      style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px', fontSize: '1rem' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Card Holder Name *</label>
                    <input type="text" placeholder="JOHN DOE" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} style={{ ...inputStyle, textTransform: 'uppercase' }} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Expiry Date *</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '').substring(0, 4);
                          if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
                          setCardExpiry(v);
                        }}
                        style={{ ...inputStyle, fontFamily: 'monospace' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>CVV *</label>
                      <input type="password" placeholder="•••" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '4px' }} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Shield size={14} /> Your card details are encrypted and processed securely.
                  </div>
                </div>
              )}

              {/* Net Banking Fields */}
              {payMode === 'Net Banking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={16} /> Net Banking Details
                  </div>
                  <div className="form-group">
                    <label>Select Bank *</label>
                    <select value={netBankingBank} onChange={e => setNetBankingBank(e.target.value)} style={selectStyle}>
                      {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'PNB', 'Bank of Baroda', 'Canara Bank', 'Other'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <AuthInput label="Transaction Reference Number *" icon={FileText} type="text" placeholder="e.g. NEFT/UTR12345" value={netBankingRef} onChange={e => setNetBankingRef(e.target.value)} required />
                </div>
              )}

              {/* Cash notice */}
              {payMode === 'Cash' && (
                <div style={{ padding: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: '14px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Banknote size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.3rem' }}>Pay at Reception</div>
                    <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: '1.5' }}>
                      Your slot is reserved. Please arrive 10 minutes early and pay <strong>₹590</strong> at the reception desk. Your appointment will be confirmed upon payment.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setStep('patient')} style={secondaryBtnStyle}>
                  <ArrowLeft size={16} /> Back
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Confirming Booking…">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={18} /> Confirm & Pay ₹{CONSULTATION_AMOUNT}
                  </div>
                </AuthButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--bg-primary)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '2rem',
  paddingTop: '2.5rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '20px',
  border: '1px solid var(--border-color)',
  boxShadow: '0 8px 40px -12px rgba(0,0,0,0.12)',
  overflow: 'hidden',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  marginTop: '0.4rem',
  fontSize: '0.9rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.9rem',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'var(--font-family)',
  marginTop: '0.4rem',
};

const baseDateCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0.5rem 0.25rem',
  borderRadius: '10px',
  transition: 'all 0.2s ease',
  minHeight: '58px',
  justifyContent: 'center',
  fontSize: '0.85rem',
  border: '1px solid var(--border-color)',
  gap: '1px',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--accent-primary)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.9rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'var(--transition-smooth)',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.25rem',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: '0.9rem',
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
};
