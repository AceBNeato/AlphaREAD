import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Sliders, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useStudent } from '../context/StudentContext';
import { ACCENT_OPTIONS } from '../types/student';

export default function Settings() {
  const navigate = useNavigate();
  const { currentProfile, updateProfile } = useStudent();
  const [phoneticBias, setPhoneticBias] = useState(currentProfile?.phoneticBias || 0.5);
  const [mlThreshold, setMlThreshold] = useState(currentProfile?.mlConfidenceThreshold || 0.6);
  const [useML, setUseML] = useState(currentProfile?.useMLValidator ?? true);

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-[#ecfeff] to-[#eff6ff] dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 flex items-center justify-center">
        <Card className="p-6 text-center max-w-md">
          <p className="text-gray-500 mb-4">Please select a profile first</p>
          <Button onClick={() => navigate('/')}>Go to Main Menu</Button>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    updateProfile(currentProfile.id, {
      phoneticBias,
      mlConfidenceThreshold: mlThreshold,
      useMLValidator: useML,
    });
    navigate('/');
  };

  const handleAccentChange = (accent: string) => {
    updateProfile(currentProfile.id, { accent: accent as any });
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
            Settings
          </h1>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Profile Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center text-3xl">
                  {currentProfile.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{currentProfile.name}</h2>
                  <p className="text-sm text-gray-500">
                    Accuracy: {currentProfile.stats.accuracy}%
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Accent Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Volume2 className="w-5 h-5 text-[#58CC02]" />
                <h3 className="text-lg font-semibold">Accent Selection</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Choose your accent to improve speech recognition accuracy
              </p>
              <div className="space-y-2">
                {ACCENT_OPTIONS.map((accent) => (
                  <button
                    key={accent.value}
                    onClick={() => handleAccentChange(accent.value)}
                    className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                      currentProfile.accent === accent.value
                        ? 'border-[#58CC02] bg-[#58CC02]/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{accent.flag}</span>
                    <span className="flex-1 text-left">{accent.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Phonetic Matching Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sliders className="w-5 h-5 text-[#1CB0F6]" />
                <h3 className="text-lg font-semibold">Phonetic Matching</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Adjust how forgiving the system is for pronunciation variations
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Strictness</label>
                    <span className="text-sm text-gray-500">
                      {phoneticBias < 0.3 ? 'Very Forgiving' : 
                       phoneticBias < 0.6 ? 'Balanced' : 'Strict'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={phoneticBias}
                    onChange={(e) => setPhoneticBias(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Forgiving</span>
                    <span>Strict</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ML Validator Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-[#FF9600]" />
                <h3 className="text-lg font-semibold">ML Validator</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Use machine learning to validate speech recognition results
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Enable ML Validator</span>
                  <button
                    onClick={() => setUseML(!useML)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      useML ? 'bg-[#58CC02]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        useML ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {useML && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium">Confidence Threshold</label>
                      <span className="text-sm text-gray-500">
                        {Math.round(mlThreshold * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="0.9"
                      step="0.1"
                      value={mlThreshold}
                      onChange={(e) => setMlThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Lower (more accepting)</span>
                      <span>Higher (stricter)</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={handleSave}
              className="w-full py-6 text-lg bg-gradient-to-r from-[#58CC02] to-[#46a302]"
            >
              Save & Continue
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
