import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useStudent } from '../context/StudentContext';
import { AVATAR_OPTIONS, ACCENT_OPTIONS } from '../types/student';
import type { AccentType } from '../types/student';

export default function ProfileSelector() {
  const navigate = useNavigate();
  const { addProfile, profiles } = useStudent();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [selectedAccent, setSelectedAccent] = useState<AccentType>('en-US');
  const [step, setStep] = useState<'name' | 'avatar' | 'accent' | 'done'>('name');

  const handleSubmit = () => {
    if (name.trim()) {
      addProfile(name.trim(), selectedAvatar, selectedAccent);
      navigate('/levels');
    }
  };

  const handleSkip = () => {
    // If there are existing profiles, go back to main menu
    if (profiles.length > 0) {
      navigate('/');
    } else {
      // Create a default profile
      addProfile('Student', AVATAR_OPTIONS[0], 'en-US');
      navigate('/levels');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-[#ecfeff] to-[#eff6ff] dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Create Profile
          </h1>
        </div>

        <Card className="p-6 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Step Indicator */}
            <div className="flex justify-center gap-2">
              {['name', 'avatar', 'accent'].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    (s === step || (s === 'name' && step === 'avatar') || 
                     (s === 'avatar' && step === 'accent') || 
                     (s === 'accent' && step === 'done'))
                      ? 'bg-gradient-to-r from-[#58CC02] to-[#46a302]'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Name Step */}
            {step === 'name' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">What's your name?</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter your name to personalize your learning
                  </p>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-[#58CC02] focus:outline-none dark:bg-gray-800"
                  maxLength={20}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={() => setStep('avatar')}
                    disabled={!name.trim()}
                    className="flex-1 bg-gradient-to-r from-[#58CC02] to-[#46a302]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Avatar Step */}
            {step === 'avatar' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Choose your avatar</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pick an avatar that represents you
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`aspect-square text-4xl rounded-xl border-2 transition-all ${
                        selectedAvatar === avatar
                          ? 'border-[#58CC02] bg-[#58CC02]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {avatar}
                      {selectedAvatar === avatar && (
                        <div className="absolute top-1 right-1">
                          <Check className="w-4 h-4 text-[#58CC02]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('name')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('accent')}
                    className="flex-1 bg-gradient-to-r from-[#58CC02] to-[#46a302]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Accent Step */}
            {step === 'accent' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Select your accent</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This helps us understand your speech better
                  </p>
                </div>
                <div className="space-y-2">
                  {ACCENT_OPTIONS.map((accent) => (
                    <button
                      key={accent.value}
                      onClick={() => setSelectedAccent(accent.value)}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                        selectedAccent === accent.value
                          ? 'border-[#58CC02] bg-[#58CC02]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{accent.flag}</span>
                      <span className="flex-1 text-left font-medium">
                        {accent.label}
                      </span>
                      {selectedAccent === accent.value && (
                        <Check className="w-5 h-5 text-[#58CC02]" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('avatar')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-gradient-to-r from-[#58CC02] to-[#46a302]"
                  >
                    Start Learning
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
