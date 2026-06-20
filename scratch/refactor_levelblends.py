import os

filepath = 'src/app/data/blends.ts' # No, this is LevelBlends.tsx
filepath = 'src/app/components/LevelBlends.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Erase Long Ending Blends span
content = content.replace(
'''                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1 sm:mt-0">
                            Long {w.category}
                          </span>''', 
'')

# 2. Add ShuffleIcon import
content = content.replace(
'''import {Home, Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, AlertCircle, RotateCcw, SkipForward, FastForward, X} from "lucide-react";''',
'''import {Home, Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, AlertCircle, RotateCcw, SkipForward, FastForward, X, Shuffle as ShuffleIcon} from "lucide-react";'''
)

# 3. Add handleShuffle function after handleBack
handle_shuffle = '''
  const handleShuffle = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "patterns") {
      setActivePatterns(prev => shuffle([...prev]));
    } else if (currentPhase === "words") {
      setActiveWords(prev => shuffle([...prev]));
    } else if (currentPhase === "sentences") {
      setActiveSentences(prev => shuffle([...prev]));
    }
  };
'''
content = content.replace(
'''  const handleBack = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "sentences") setCurrentPhase("words");
    else if (currentPhase === "words") setCurrentPhase("patterns");
    else if (currentPhase === "patterns") setCurrentPhase("review");
    else navigate(-1);
  };''',
'''  const handleBack = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "sentences") setCurrentPhase("words");
    else if (currentPhase === "words") setCurrentPhase("patterns");
    else if (currentPhase === "patterns") setCurrentPhase("review");
    else navigate(-1);
  };
''' + handle_shuffle
)

# 4. Replace Back button in bottom controls with Shuffle
# There are 3 instances of this (patterns, words, sentences)
# They all look exactly like:
#                 <Button
#                   variant="outline"
#                   size="sm"
#                   onClick={handleBack}
#                   className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
#                   style={{
#                     background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
#                   }}
#                 >
#                   <ArrowLeft className="w-4 h-4 sm:mr-1" />
#                   <span className="hidden sm:inline">Back</span>
#                 </Button>

content = content.replace(
'''                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                  }}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>''',
'''                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffle}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                  }}
                >
                  <ShuffleIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>'''
)

# 5. Erase "What Sound is this? 🗣️" section in patterns phase
content = content.replace(
'''              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  What Sound is this? 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the correct long vowel name 2 times out loud.
                </p>
              </div>''',
''
)

# 6. Change top header "All Vowel Patterns Quiz"
content = content.replace(
'''{currentPhase === "patterns" && `All Vowel Patterns Quiz`}''',
'''{currentPhase === "patterns" && `${categoryFilter || "Blends"} - Voice Evaluation`}'''
)

# 7. Replace Review phase bottom buttons with exact requested buttons
# The original has Next Group and Start Pattern Quiz. The user wants Start Pattern Quiz directly next to Back.
original_buttons = '''              <div className="flex justify-between items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold max-w-[200px]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                {reviewIdx < filteredData.length - 1 ? (
                  <Button
                    size="lg"
                    onClick={() => setReviewIdx((prev) => Math.min(prev + 1, filteredData.length - 1))}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next Group <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setCurrentPhase("patterns")}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg animate-pulse"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Start Pattern Quiz! <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>'''

new_buttons = '''              <div className="flex justify-between items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold max-w-[200px] bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setCurrentPhase("patterns")}
                  className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg animate-pulse bg-primary hover:bg-primary/90"
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                >
                  Start Pattern Quiz! <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>'''

content = content.replace(original_buttons, new_buttons)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied UI modifications to LevelBlends.tsx")
