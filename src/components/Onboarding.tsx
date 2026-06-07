import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Check, ArrowRight, Sparkles, User, Calendar, Bell } from 'lucide-react';

export default function Onboarding() {
  const { updateSetting, setOnboarded } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [year, setYear] = useState('2026');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (name.trim()) {
        await updateSetting('userName', name.trim());
      }
      await updateSetting('year', year);
      setStep(3);
    } else if (step === 3) {
      await updateSetting('reminderTime', reminderTime);
      await updateSetting('remindersEnabled', remindersEnabled ? 'true' : 'false');
      setOnboarded(true);
    }
  };

  const handleSkip = () => {
    setOnboarded(true);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card animate-slide-up">
        {/* Step Indicators */}
        <div className="onboarding-progress">
          <div className={`onboarding-step-indicator ${step >= 1 ? 'active' : ''}`} />
          <div className={`onboarding-step-indicator ${step >= 2 ? 'active' : ''}`} />
          <div className={`onboarding-step-indicator ${step >= 3 ? 'active' : ''}`} />
        </div>

        {step === 1 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div className="sidebar-logo" style={{ width: '64px', height: '64px', fontSize: '1.75rem', borderRadius: '16px' }}>
              PT
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '1rem' }}>Welcome to ProTrack</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Your native macOS productivity companion. Log activities, monitor your daily scores, and visualize your achievement trends with elegant performance dashboarding.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} onClick={handleNext}>
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={24} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Personalize your Tracker</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Enter your name and the tracking year. ProTrack will pre-populate a 365-day grid for you.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} /> Name
              </label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. Rohan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} /> Tracking Year
              </label>
              <select
                className="select-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn" style={{ flexGrow: 1 }} onClick={handleSkip}>
                Skip
              </button>
              <button className="btn btn-primary" style={{ flexGrow: 2 }} onClick={handleNext} disabled={!name.trim()}>
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Bell size={24} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Daily Reminders</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Establish a daily notification reminder so you never miss logging your wealth management activities.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
              <input
                type="checkbox"
                id="enable-reminders"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="enable-reminders" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                Enable daily reminder notifications
              </label>
            </div>

            {remindersEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'slideUp 0.2s ease' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Reminder Time
                </label>
                <input
                  type="time"
                  className="text-input"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn" style={{ flexGrow: 1 }} onClick={handleSkip}>
                Skip
              </button>
              <button className="btn btn-primary" style={{ flexGrow: 2 }} onClick={handleNext}>
                Finish <Check size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
