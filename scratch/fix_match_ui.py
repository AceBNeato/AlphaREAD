import os

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

match_ui = """          ) : !showConfetti && currentPhase === "match" && activePatterns.length > 0 ? (
            <motion.div
              key={`phase-match-${matchIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <p className="text-gray-500 mt-2">
                  Listen to the sound and match the correct blend.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border-2 border-gray-100 dark:border-gray-700 shadow-xl mb-12 w-full max-w-sm flex flex-col items-center justify-center min-h-[200px]">
                <Button
                  onClick={() => playPatternAudio(activePatterns[matchIdx].pattern, activePatterns[matchIdx].category)}
                  className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all mb-4"
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                >
                  <Volume2 className="w-12 h-12 text-white" />
                </Button>
                <p className="text-gray-500 font-bold text-lg">Tap to hear again</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
                {matchOptions.map((opt, i) => {
                  const isSelected = showMatchFeedback !== null;
                  const isCorrectTarget = opt.pattern === activePatterns[matchIdx].pattern;
                  
                  let borderClass = "border-gray-200 dark:border-gray-700";
                  let bgClass = "bg-white dark:bg-gray-800";
                  let opacityClass = "opacity-100";

                  if (isSelected) {
                    if (isCorrectTarget) {
                      borderClass = "border-green-500 shadow-green-500/20";
                      bgClass = "bg-green-50 dark:bg-green-900/20";
                    } else {
                      opacityClass = "opacity-40 grayscale";
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={isSelected}
                      onClick={() => {
                        if (isCorrectTarget) {
                          playSound("correct");
                          setShowMatchFeedback("correct");
                          setTimeout(() => {
                            setShowMatchFeedback(null);
                            if (matchIdx < activePatterns.length - 1) {
                              setMatchIdx(m => m + 1);
                            } else {
                              setShowConfetti(true);
                              playSound("milestone");
                            }
                          }, 1500);
                        } else {
                          playSound("wrong");
                          setShowMatchFeedback("wrong");
                          setTimeout(() => setShowMatchFeedback(null), 800);
                        }
                      }}
                      className={`relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-4 shadow-lg transition-all hover:scale-105 active:scale-95 ${borderClass} ${bgClass} ${opacityClass}`}
                    >
                      <span className="text-4xl font-black text-gray-700 dark:text-gray-200">
                        {opt.pattern}
                      </span>
                      {isSelected && isCorrectTarget && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-3 -right-3 bg-green-500 rounded-full p-1"
                        >
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
"""

new_lines = lines[:538] + [match_ui] + lines[678:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Replaced lines successfully!")
