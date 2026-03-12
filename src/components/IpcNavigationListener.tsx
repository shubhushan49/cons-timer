import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IpcNavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { onNavigateTo?: (cb: (path: string) => void) => (() => void) | void } }).electronAPI;
    if (!api?.onNavigateTo) return;
    const cleanup = api.onNavigateTo((path: string) => navigate(path));
    return () => { cleanup?.(); };
  }, [navigate]);

  return null;
}
