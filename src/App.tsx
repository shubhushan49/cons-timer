import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { TimerProvider } from './context/TimerContext';
import { ThemeProvider } from './context/ThemeContext';
import SplashPage from './pages/SplashPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import SequencesPage from './pages/SequencesPage';
import SequenceEditorPage from './pages/SequenceEditorPage';
import SettingsPage from './pages/SettingsPage';
import TabLayout from './components/TabLayout';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <TimerProvider>
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<TabLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sequences" element={<SequencesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/sequence/:id" element={<SequenceEditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TimerProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
