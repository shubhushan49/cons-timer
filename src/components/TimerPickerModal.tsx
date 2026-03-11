import { useState, useEffect } from 'react';
import { ScrollPicker } from './ScrollPicker';
import { useTheme } from '../context/ThemeContext';
import { X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  mode: 'duration' | 'time';
  initialValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
};

export function TimerPickerModal({
  isOpen,
  mode,
  initialValue,
  onConfirm,
  onCancel,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const isTimeMode = mode === 'time';

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setHours(isTimeMode ? Math.floor(initialValue / 60) : Math.floor(initialValue / 3600));
      setMinutes(isTimeMode ? initialValue % 60 : Math.floor((initialValue % 3600) / 60));
      setSeconds(isTimeMode ? 0 : initialValue % 60);
    }
  }, [isOpen, initialValue, isTimeMode]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isTimeMode) {
      onConfirm(hours * 60 + minutes);
    } else {
      onConfirm(Math.max(1, hours * 3600 + minutes * 60 + seconds));
    }
  };

  const title = isTimeMode ? 'Set Time' : 'Set Duration';

  const previewText = isTimeMode
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`w-full max-w-sm rounded-2xl shadow-xl ${
          isDark ? 'bg-slate-800' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600">
          <button
            onClick={onCancel}
            className="text-sky-600 font-medium flex items-center gap-1"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={handleConfirm}
            className="text-sky-600 font-semibold"
          >
            Done
          </button>
        </div>

        <div className="py-6">
          <p
            className={`text-center text-xl font-semibold tabular-nums ${
              isDark ? 'text-slate-200' : 'text-slate-600'
            }`}
          >
            {previewText}
          </p>
        </div>

        <div className="flex justify-center items-center gap-2 px-4 pb-6">
          <ScrollPicker
            min={0}
            max={isTimeMode ? 23 : 99}
            value={hours}
            onChange={setHours}
            label={isTimeMode ? 'hr' : 'hr'}
            isDark={isDark}
          />
          <span
            className={`text-4xl font-bold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            :
          </span>
          <ScrollPicker
            min={0}
            max={59}
            value={minutes}
            onChange={setMinutes}
            label="min"
            isDark={isDark}
          />
          {!isTimeMode && (
            <>
              <span
                className={`text-4xl font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                :
              </span>
              <ScrollPicker
                min={0}
                max={59}
                value={seconds}
                onChange={setSeconds}
                label="sec"
                isDark={isDark}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
