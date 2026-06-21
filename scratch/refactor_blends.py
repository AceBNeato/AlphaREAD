import re
import os

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Phase type
content = content.replace(
    'type Phase = "review" | "patterns" | "words" | "sentences";',
    'type Phase = "review" | "match" | "words" | "sentences";'
)

# 2. Add Match State and playPatternAudio
state_insertion = """  // Match Phase State
  const [matchIdx, setMatchIdx] = useState(0);
  const [matchOptions, setMatchOptions] = useState<{ pattern: string; category: string; name: string }[]>([]);
  const [showMatchFeedback, setShowMatchFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (currentPhase === "match" && activePatterns.length > 0) {
      const current = activePatterns[matchIdx];
      if (!current) return;
      const others = allPatternsRaw.filter(p => p.pattern !== current.pattern);
      const randomOthers = shuffle(others).slice(0, 2);
      setMatchOptions(shuffle([current, ...randomOthers]));
      
      // Auto play on new question
      setTimeout(() => playPatternAudio(current.pattern, current.category), 500);
    }
  }, [currentPhase, matchIdx, activePatterns, allPatternsRaw]);

  const playPatternAudio = useCallback((pattern: string, category: string) => {
    let folder = "";
    if (category === "3-Letter Blends") {
      folder = "3letterblend";
    } else if (category === "Ending Blends") {
      folder = "longend";
    } else {
      folder = "2letterblend";
    }
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/${folder}/${folder}-${pattern}.mp3`);
    audio.play().catch(e => console.error(e));
  }, []);

"""

# Insert after setPatternIdx
content = content.replace(
    '  const [patternIdx, setPatternIdx] = useState(0);',
    '  const [patternIdx, setPatternIdx] = useState(0);\n\n' + state_insertion
)

# 3. Replace reviewing filteredData with chunks of allPatternsRaw
# In LevelBlends.tsx, reviewIdx was used for filteredData.
# We will just replace `filteredData[reviewIdx]?.patterns.map((pattern) => {`
# with `allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).map((pattern) => {`
# Wait, `filteredData.length` was used for the Next button:
# `reviewIdx < filteredData.length - 1` -> `reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1`
# `Math.min(prev + 1, filteredData.length - 1)` -> `Math.min(prev + 1, Math.ceil(allPatternsRaw.length / 6) - 1)`

content = content.replace('reviewIdx < filteredData.length - 1', 'reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1')
content = content.replace('Math.min(prev + 1, filteredData.length - 1)', 'Math.min(prev + 1, Math.ceil(allPatternsRaw.length / 6) - 1)')
content = content.replace('filteredData[reviewIdx]?.patterns.map((pattern)', 'allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).map((pattern)')

# Change the grid to 2-3 columns since 6 items
content = content.replace(
    'className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${(filteredData[reviewIdx]?.patterns.length || 0) === 1',
    'className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).length === 1'
)
content = content.replace(
    '(filteredData[reviewIdx]?.patterns.length || 0) === 2',
    'allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).length === 2'
)

# Replace the onClick in review phase to play TTS or pattern audio
content = content.replace(
    'onClick={() => playTTSUtil(pattern.pattern)}',
    'onClick={() => playPatternAudio(pattern.pattern, pattern.category)}'
)

# 4. Erase the uppercase label
content = re.sub(r'<span className="text-xs uppercase font-bold tracking-wider text-amber-500 dark:text-amber-400 block mb-1">[^<]+</span>', '', content)
content = re.sub(r'<span className="text-xs uppercase font-bold tracking-wider text-gray-400 block mb-1">[^<]+</span>', '', content)

# 5. Replace `currentPhase === "patterns"` block with `currentPhase === "match"`
# This requires replacing a large block.
match_ui = """          {!showConfetti && currentPhase === "match" && activePatterns.length > 0 && (
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
          )}

          {showConfetti && currentPhase === "match" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Sparkles className="w-20 h-20 text-[#FFC800] mx-auto mb-6" />
              <h3 className="text-3xl mb-4" style={{ color: accent.primary }}>
                Excellent matching!
              </h3>
              <p className="text-gray-500 mt-2 mb-8">
                You matched all the blends correctly!
              </p>
              <Button
                onClick={() => {
                  setCurrentPhase("words");
                  setShowConfetti(false);
                }}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
              >
                Start Voice Evaluation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}
"""

# Find the patterns phase in LevelBlends.tsx and replace it.
# We can use regex to match the whole block for `currentPhase === "patterns"` 
# up to the words phase or we can just replace the string.

# The block starts at `{!showConfetti && currentPhase === "patterns" && (`
# and ends right before `{!showConfetti && currentPhase === "words" && (`

pattern_block_regex = re.compile(r'\{\!showConfetti && currentPhase === "patterns" && \(.+?\{\!showConfetti && currentPhase === "words" && \(', re.DOTALL)
content = pattern_block_regex.sub(match_ui + '\n\n          {!showConfetti && currentPhase === "words" && (', content)

# Remove `showConfetti && currentPhase === "patterns"` block
confetti_patterns_regex = re.compile(r'\{showConfetti && currentPhase === "patterns" && \(.+?Start Voice Evaluation <ArrowRight className="ml-2 w-5 h-5" />\s*</Button>\s*</motion\.div>\s*\)\}', re.DOTALL)
content = confetti_patterns_regex.sub('', content)

# 6. Replace header and Next phase logic
content = content.replace('setCurrentPhase("patterns")', 'setCurrentPhase("match")')
content = content.replace('currentPhase === "patterns" && `Blends - Voice Evaluation`', 'currentPhase === "match" && `Blends - Listen & Match`')
content = content.replace('currentPhase === "patterns" && `Step 2/4`', 'currentPhase === "match" && `Step 2/4`')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored LevelBlends.tsx")
