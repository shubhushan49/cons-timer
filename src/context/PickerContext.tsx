import React, { createContext, useCallback, useContext, useRef } from 'react';

type PickerCallback = (value: number) => void;

type PickerContextValue = {
  registerCallback: (cb: PickerCallback) => void;
  fireCallback: (value: number) => void;
};

const PickerContext = createContext<PickerContextValue | null>(null);

export function PickerProvider({ children }: { children: React.ReactNode }) {
  const callbackRef = useRef<PickerCallback | null>(null);

  const registerCallback = useCallback((cb: PickerCallback) => {
    callbackRef.current = cb;
  }, []);

  const fireCallback = useCallback((value: number) => {
    callbackRef.current?.(value);
    callbackRef.current = null;
  }, []);

  return (
    <PickerContext.Provider value={{ registerCallback, fireCallback }}>
      {children}
    </PickerContext.Provider>
  );
}

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error('usePicker must be used within PickerProvider');
  return ctx;
}
