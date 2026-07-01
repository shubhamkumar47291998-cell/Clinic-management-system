import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { X, Save, Check, AlertCircle, Plus, Trash2, Calendar } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';

interface ScheduleEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

interface DoctorScheduleModalProps {
  doctorId: string;
  doctorName: string;
  onClose: () => void;
}

interface LeaveEntry {
  id: string;
  leave_date: string;
  reason: string | null;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DoctorScheduleModal: React.FC<DoctorScheduleModalProps> = ({
  doctorId,
  doctorName,
  onClose,
}) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'timings' | 'leaves'>('timings');
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initialize a default schedules array (all 7 days inactive)
  const defaultSchedules = (): ScheduleEntry[] =>
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration_minutes: 15,
      is_active: false,
    }));

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch weekly timings
      const { data: timingData, error: timingErr } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, slot_duration_minutes, is_active')
        .eq('doctor_id', doctorId);

      if (timingErr) throw timingErr;

      const template = defaultSchedules();
      if (timingData && timingData.length > 0) {
        timingData.forEach((dbRow) => {
          const matched = template.find((t) => t.day_of_week === dbRow.day_of_week);
          if (matched) {
            matched.start_time = dbRow.start_time.substring(0, 5); // Format "09:00:00" -> "09:00"
            matched.end_time = dbRow.end_time.substring(0, 5);
            matched.slot_duration_minutes = dbRow.slot_duration_minutes;
            matched.is_active = dbRow.is_active;
          }
        });
      }
      setSchedules(template);

      // 2. Fetch doctor leaves
      const { data: leaveData, error: leaveErr } = await supabase
        .from('doctor_leaves')
        .select('id, leave_date, reason')
        .eq('doctor_id', doctorId)
        .order('leave_date', { ascending: true });

      if (leaveErr) throw leaveErr;
      setLeaves(leaveData || []);

    } catch (err: any) {
      console.error('Error fetching schedules/leaves:', err);
      setErrorMsg(err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleToggleDay = (dayIdx: number) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIdx ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleFieldChange = (
    dayIdx: number,
    field: keyof ScheduleEntry,
    value: any
  ) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayIdx ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveSchedules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    // Validate times for active slots
    for (let s of schedules) {
      if (s.is_active) {
        if (s.start_time >= s.end_time) {
          setErrorMsg(
            `Invalid time range for ${DAYS_OF_WEEK[s.day_of_week]}: Start time must be before End time.`
          );
          return;
        }
        if (s.slot_duration_minutes <= 0) {
          setErrorMsg(
            `Invalid duration for ${DAYS_OF_WEEK[s.day_of_week]}: Slot duration must be greater than 0.`
          );
          return;
        }
      }
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const recordsToUpsert = schedules.map((s) => ({
        clinic_id: profile.clinic_id,
        doctor_id: doctorId,
        day_of_week: s.day_of_week,
        start_time: s.start_time + ':00',
        end_time: s.end_time + ':00',
        slot_duration_minutes: Number(s.slot_duration_minutes),
        is_active: s.is_active,
      }));

      const { error } = await supabase
        .from('doctor_schedules')
        .upsert(recordsToUpsert, { onConflict: 'doctor_id,day_of_week' });

      if (error) throw error;

      setSuccessMsg('Schedule updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save weekly schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !newLeaveDate) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('doctor_leaves')
        .insert({
          clinic_id: profile.clinic_id,
          doctor_id: doctorId,
          leave_date: newLeaveDate,
          reason: newLeaveReason.trim() || 'On Leave'
        });

      if (error) {
        if (error.message.includes('doctor_leave_date_unique')) {
          throw new Error('Leave date is already registered for this doctor.');
        }
        throw error;
      }

      setSuccessMsg('Leave registered successfully!');
      setNewLeaveDate('');
      setNewLeaveReason('');
      
      // Reload leaves
      const { data } = await supabase
        .from('doctor_leaves')
        .select('id, leave_date, reason')
        .eq('doctor_id', doctorId)
        .order('leave_date', { ascending: true });
      setLeaves(data || []);

      setTimeout(() => setSuccessMsg(''), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register leave.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!window.confirm('Are you sure you want to cancel this leave?')) return;
    try {
      const { error } = await supabase
        .from('doctor_leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;

      setLeaves(prev => prev.filter(l => l.id !== leaveId));
      setSuccessMsg('Leave cancelled successfully.');
      setTimeout(() => setSuccessMsg(''), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel leave.');
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={contentStyle}>
        <div className="modal-header" style={headerStyle}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Schedule & Availability Config</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Configure parameters for <strong>Dr. {doctorName}</strong>
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switchers */}
        <div style={tabContainerStyle}>
          <button
            type="button"
            onClick={() => { setActiveTab('timings'); setErrorMsg(''); setSuccessMsg(''); }}
            style={tabButtonStyle(activeTab === 'timings')}
          >
            Weekly Timings
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('leaves'); setErrorMsg(''); setSuccessMsg(''); }}
            style={tabButtonStyle(activeTab === 'leaves')}
          >
            Leaves & Holidays
          </button>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading configurations...</div>
        ) : activeTab === 'timings' ? (
          <form onSubmit={handleSaveSchedules}>
            <div style={scheduleListStyle}>
              {schedules.map((s) => (
                <div key={s.day_of_week} style={dayRowStyle(s.is_active)}>
                  <div style={dayInfoStyle}>
                    <input
                      type="checkbox"
                      id={`day-chk-${s.day_of_week}`}
                      checked={s.is_active}
                      onChange={() => handleToggleDay(s.day_of_week)}
                      style={checkboxStyle}
                    />
                    <label
                      htmlFor={`day-chk-${s.day_of_week}`}
                      style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    >
                      {DAYS_OF_WEEK[s.day_of_week]}
                    </label>
                  </div>

                  <div style={inputsContainerStyle(s.is_active)}>
                    <div style={inputGroupStyle}>
                      <span style={inputLabelStyle}>From</span>
                      <input
                        type="time"
                        value={s.start_time}
                        onChange={(e) =>
                          handleFieldChange(s.day_of_week, 'start_time', e.target.value)
                        }
                        disabled={!s.is_active || saving}
                        style={timeInputStyle}
                      />
                    </div>

                    <div style={inputGroupStyle}>
                      <span style={inputLabelStyle}>To</span>
                      <input
                        type="time"
                        value={s.end_time}
                        onChange={(e) =>
                          handleFieldChange(s.day_of_week, 'end_time', e.target.value)
                        }
                        disabled={!s.is_active || saving}
                        style={timeInputStyle}
                      />
                    </div>

                    <div style={inputGroupStyle}>
                      <span style={inputLabelStyle}>Mins/Slot</span>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={s.slot_duration_minutes}
                        onChange={(e) =>
                          handleFieldChange(
                            s.day_of_week,
                            'slot_duration_minutes',
                            e.target.value
                          )
                        }
                        disabled={!s.is_active || saving}
                        style={durationInputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
                disabled={saving}
              >
                Cancel
              </button>
              <AuthButton type="submit" loading={saving} loadingText="Saving...">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> Save Timings
                </div>
              </AuthButton>
            </div>
          </form>
        ) : (
          <div>
            {/* Add Leave Form */}
            <form onSubmit={handleAddLeave} style={addLeaveFormStyle}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ flex: '1', minWidth: '150px' }}>
                  <label style={fieldLabelStyle}>Leave Date *</label>
                  <input
                    type="date"
                    value={newLeaveDate}
                    onChange={(e) => setNewLeaveDate(e.target.value)}
                    required
                    style={{ ...timeInputStyle, width: '100%', padding: '0.5rem' }}
                  />
                </div>
                <div style={{ flex: '2', minWidth: '220px' }}>
                  <label style={fieldLabelStyle}>Reason / Holiday Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference, Medical Leave, Annual Clinic Off"
                    value={newLeaveReason}
                    onChange={(e) => setNewLeaveReason(e.target.value)}
                    style={{ ...timeInputStyle, width: '100%', padding: '0.5rem' }}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !newLeaveDate}
                style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1.25rem' }}
              >
                <Plus size={16} /> Register Leave Date
              </button>
            </form>

            {/* Leaves List */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Registered Leave Calendar Dates</h3>
              {leaves.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No leaves registered for this practitioner.</p>
              ) : (
                <div style={leavesListStyle}>
                  {leaves.map((l) => (
                    <div key={l.id} style={leaveRowStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} style={{ color: '#ef4444' }} />
                        <strong>{new Date(l.leave_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong>
                        {l.reason && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>- {l.reason}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(l.id)}
                        style={deleteLeaveBtnStyle}
                        title="Cancel Leave Date"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  backdropFilter: 'blur(4px)',
};

const contentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  maxWidth: '650px',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border-color)',
  marginBottom: '1.5rem',
  gap: '0.5rem'
};

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  border: 'none',
  background: 'none',
  borderBottom: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  transition: 'all 0.15s ease'
});

const scheduleListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  maxHeight: '320px',
  overflowY: 'auto',
  paddingRight: '0.5rem',
};

const dayRowStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
  opacity: isActive ? 1 : 0.6,
  transition: 'var(--transition-smooth)',
  flexWrap: 'wrap',
  gap: '1rem',
});

const dayInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  minWidth: '130px',
};

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
};

const inputsContainerStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  pointerEvents: isActive ? 'auto' : 'none',
});

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const timeInputStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.85rem',
};

const durationInputStyle: React.CSSProperties = {
  width: '60px',
  padding: '0.375rem 0.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.85rem',
  textAlign: 'center',
};

const addLeaveFormStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  background: 'var(--bg-primary)',
  padding: '1.25rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)'
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.25rem'
};

const leavesListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  maxHeight: '180px',
  overflowY: 'auto'
};

const leaveRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)'
};

const deleteLeaveBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  padding: '0.25rem'
};
