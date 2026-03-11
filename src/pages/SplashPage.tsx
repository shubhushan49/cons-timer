import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSetting } from '../db/settings';

export default function SplashPage() {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSetting('onboarding_done')
      .then((v) => setOnboardingDone(v === '1'))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setReady(true));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-100 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Error</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (onboardingDone) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/onboarding" replace />;
}
