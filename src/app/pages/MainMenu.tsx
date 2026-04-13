import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { 
  Play, 
  Users, 
  Settings, 
  Trophy, 
  BarChart3, 
  LogOut,
  Sparkles,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useStudent } from '../context/StudentContext';
import { ThemeToggle } from '../components/ThemeToggle';

export default function MainMenu() {
  const navigate = useNavigate();
  const { currentProfile, profiles, selectProfile, logout } = useStudent();

  const handleContinue = () => {
    if (currentProfile) {
      const lastLevel = currentProfile.stats.lastLevel;
      navigate(`/lesson/${lastLevel}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-[#ecfeff] to-[#eff6ff] dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl shadow-lg bg-gradient-to-br from-[#58CC02] to-[#46a302]">
              <Sparkles className="w-8 h-8 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58CC02] via-[#1CB0F6] to-[#FF9600]">
                Alphabet GO!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Master the alphabet through fun learning
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {currentProfile ? (
          /* Logged In View */
          <div className="space-y-6">
            {/* Welcome Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-gradient-to-r from-[#58CC02]/10 to-[#1CB0F6]/10 border-[#58CC02]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center text-3xl">
                      {currentProfile.avatar}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        Welcome, {currentProfile.name}!
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Accuracy: {currentProfile.stats.accuracy}% • Level {currentProfile.stats.lastLevel}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Continue Learning Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-all border-[#FF9600] bg-gradient-to-r from-[#FF9600]/10 to-[#FF4B8A]/10"
                onClick={handleContinue}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9600] to-[#FF4B8A] flex items-center justify-center">
                      <Play className="w-7 h-7 text-white" fill="white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Continue Learning
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Resume Level {currentProfile.stats.lastLevel}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <Card 
                className="p-5 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/levels')}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#58CC02] to-[#46a302] flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">All Levels</span>
                  <span className="text-xs text-gray-500">6 levels to master</span>
                </div>
              </Card>

              <Card 
                className="p-5 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate('/stats')}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">My Progress</span>
                  <span className="text-xs text-gray-500">View your stats</span>
                </div>
              </Card>
            </motion.div>

            {/* Other Students */}
            {profiles.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Switch Profile
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {profiles
                    .filter(p => p.id !== currentProfile.id)
                    .map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => selectProfile(profile)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#58CC02] transition-colors"
                      >
                        <span className="text-xl">{profile.avatar}</span>
                        <span className="text-sm font-medium">{profile.name}</span>
                      </button>
                    ))}
                  <button
                    onClick={() => navigate('/profiles')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Logged Out View */
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Who's Learning?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create a profile to track your progress and personalize your learning experience
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/profiles')}
                    className="bg-gradient-to-r from-[#58CC02] to-[#46a302] text-white px-8"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Profile
                  </Button>
                </div>
              </Card>
            </motion.div>

            {profiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Existing Profiles
                </h3>
                <div className="grid gap-3">
                  {profiles.map(profile => (
                    <Card 
                      key={profile.id}
                      className="p-4 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => selectProfile(profile)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{profile.avatar}</span>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {profile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Level {profile.stats.lastLevel} • {profile.stats.accuracy}% accuracy
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
