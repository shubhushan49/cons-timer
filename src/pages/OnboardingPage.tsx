import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSequence, createTimer } from '../db/sequences';
import { setSetting } from '../db/settings';
import { requestPermissions } from '../services/notifications';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const requestPerms = async () => {
    setLoading(true);
    try {
      await requestPermissions();
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSequence = async () => {
    setLoading(true);
    try {
      const seqId = await createSequence('Engineer Default', 'indefinite', null);
      await createTimer(seqId, 0, 5 * 60, 'Stretch', 'break', null, true);
      await createTimer(seqId, 1, 55 * 60, 'Work', 'work', null, true);
      await createTimer(seqId, 2, 5 * 60, 'Quick break', 'break', null, true);
      await setSetting('onboarding_done', '1');
      navigate('/dashboard', { replace: true });
    } catch (e: unknown) {
      console.error('Onboarding error:', e);
      alert(`Could not create default sequence: ${e instanceof Error ? e.message : e}. Try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
        Pomodoro Flex
      </h1>
      <p className="text-lg text-slate-500 dark:text-slate-400 text-center mb-8">
        Gentle reminders to stretch and walk.
      </p>

      {step === 0 && (
        <div className="max-w-md w-full">
          <p className="text-base text-slate-600 dark:text-slate-300 leading-6 mb-6">
            We'll ask for notification access so you can get "Time to Move!" reminders.
          </p>
          <button
            onClick={requestPerms}
            disabled={loading}
            className="w-full py-4 px-6 bg-sky-600 text-white rounded-xl font-semibold text-base disabled:opacity-60"
          >
            {loading ? '…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="max-w-md w-full">
          <p className="text-base text-slate-600 dark:text-slate-300 leading-6 mb-6">
            We've created a default sequence: 5 min stretch → 55 min work → 5 min break, repeating.
            You can edit or add more from the Sequences tab.
          </p>
          <button
            onClick={createDefaultSequence}
            disabled={loading}
            className="w-full py-4 px-6 bg-sky-600 text-white rounded-xl font-semibold text-base disabled:opacity-60"
          >
            {loading ? '…' : 'Get started'}
          </button>
        </div>
      )}
    </div>
  );
}
