import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StudentProfile, StudentStats, AccentType } from '../types/student';

interface StudentContextType {
  profiles: StudentProfile[];
  currentProfile: StudentProfile | null;
  addProfile: (name: string, avatar: string, accent: AccentType) => void;
  updateProfile: (id: string, updates: Partial<StudentProfile>) => void;
  deleteProfile: (id: string) => void;
  selectProfile: (profile: StudentProfile) => void;
  updateStats: (stats: Partial<StudentStats>) => void;
  logout: () => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

const STORAGE_KEY = 'alphabetGo_profiles';
const CURRENT_PROFILE_KEY = 'alphabetGo_currentProfile';

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<StudentProfile | null>(null);

  // Load profiles from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProfiles(JSON.parse(stored));
    }
    const current = localStorage.getItem(CURRENT_PROFILE_KEY);
    if (current) {
      setCurrentProfile(JSON.parse(current));
    }
  }, []);

  // Save profiles when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  // Save current profile when it changes
  useEffect(() => {
    if (currentProfile) {
      localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(currentProfile));
    } else {
      localStorage.removeItem(CURRENT_PROFILE_KEY);
    }
  }, [currentProfile]);

  const addProfile = useCallback((name: string, avatar: string, accent: AccentType) => {
    const newProfile: StudentProfile = {
      id: Date.now().toString(),
      name,
      avatar,
      accent,
      phoneticBias: 0.5,
      mlConfidenceThreshold: 0.6,
      useMLValidator: true,
      createdAt: new Date().toISOString(),
      stats: {
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
        lastLevel: 1,
        weakSounds: [],
        strongSounds: [],
        sessionHistory: [],
      },
    };
    setProfiles(prev => [...prev, newProfile]);
    setCurrentProfile(newProfile);
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<StudentProfile>) => {
    setProfiles(prev => 
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    );
    if (currentProfile?.id === id) {
      setCurrentProfile(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [currentProfile]);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (currentProfile?.id === id) {
      setCurrentProfile(null);
    }
  }, [currentProfile]);

  const selectProfile = useCallback((profile: StudentProfile) => {
    setCurrentProfile(profile);
  }, []);

  const updateStats = useCallback((stats: Partial<StudentStats>) => {
    if (!currentProfile) return;
    
    const updatedStats = { ...currentProfile.stats, ...stats };
    const updatedProfile = { ...currentProfile, stats: updatedStats };
    
    setCurrentProfile(updatedProfile);
    setProfiles(prev => 
      prev.map(p => p.id === currentProfile.id ? updatedProfile : p)
    );
  }, [currentProfile]);

  const logout = useCallback(() => {
    setCurrentProfile(null);
    localStorage.removeItem(CURRENT_PROFILE_KEY);
  }, []);

  return (
    <StudentContext.Provider value={{
      profiles,
      currentProfile,
      addProfile,
      updateProfile,
      deleteProfile,
      selectProfile,
      updateStats,
      logout,
    }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}
