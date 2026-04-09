import React from 'react';
import LevelVoicePractice, { createLetterVoiceLevel, createCVCVoiceLevel } from '../components/LevelVoicePractice';
import { useNavigate } from 'react-router';

export default function VoicePractice() {
  const navigate = useNavigate();
  
  // For now, let's create a letter voice practice level
  // You can extend this to support different types based on URL params
  const voiceItems = createLetterVoiceLevel();

  const handleLevelComplete = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <LevelVoicePractice
        title="Voice Practice - Letters"
        subtitle="Practice saying each letter out loud"
        items={voiceItems}
        onLevelComplete={handleLevelComplete}
      />
    </div>
  );
}
