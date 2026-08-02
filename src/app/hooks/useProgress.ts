import { useState, useEffect } from 'react';
import { markLevelComplete as markCompleteService } from '../services/progress';

export function useProgress() {
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  // Initialize and listen for storage events to keep tabs in sync (if needed)
  useEffect(() => {
    const fetchProgress = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem('completedLevels') || '[]');
        setCompletedLevels(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCompletedLevels([]);
      }
    };
    
    fetchProgress();
    
    // Custom event listener for same-tab updates
    const handleProgressUpdate = () => fetchProgress();
    window.addEventListener('progressUpdated', handleProgressUpdate);
    
    // Standard storage event for cross-tab updates
    window.addEventListener('storage', fetchProgress);
    
    return () => {
      window.removeEventListener('progressUpdated', handleProgressUpdate);
      window.removeEventListener('storage', fetchProgress);
    };
  }, []);

  const markLevelComplete = (levelId: number) => {
    markCompleteService(levelId);
    
    // Update local state immediately for faster UI feedback
    setCompletedLevels(prev => {
      if (!prev.includes(levelId)) {
        const next = [...prev, levelId];
        // Dispatch event so other components using this hook update immediately
        window.dispatchEvent(new Event('progressUpdated'));
        return next;
      }
      return prev;
    });
  };

  return {
    completedLevels,
    markLevelComplete
  };
}
