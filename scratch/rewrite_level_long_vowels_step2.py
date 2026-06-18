import json

with open('src/app/components/LevelLongVowels_step1.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Review Phase Controls
review_controls = """
              <div className="text-center mb-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reviewIdx === 0}
                    onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  {reviewIdx < 4 ? (
                    <Button
                      size="sm"
                      onClick={() => setReviewIdx((prev) => Math.min(prev + 1, 4))}
                      className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                      }}
                    >
                      Next <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setCurrentPhase("match")}
                      className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all animate-pulse h-9 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                      }}
                    >
                      Proceed <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
"""

old_review_head = """              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Long {VOWELS[reviewIdx]} Combinations
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
              </div>"""

content = content.replace(old_review_head, review_controls)

old_review_bottom = """              <div className="flex justify-between items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold max-w-[200px]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                {reviewIdx < 4 ? (
                  <Button
                    size="lg"
                    onClick={() => setReviewIdx((prev) => Math.min(prev + 1, 4))}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next Vowel <ArrowRight className="w-5 h-5 ml-2" />
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
              </div>"""

content = content.replace(old_review_bottom, "")

# 2. Insert Match Phase UI
match_phase_ui = """          ) : !showConfetti && currentPhase === "match" ? (
            <motion.div key={`phase-match`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-6">
                <p className="text-gray-500 mt-2">Tap a speaker, then tap the matching pattern!</p>
                {/* Controls */}
                <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)" }}
                  >
                    <Shuffle className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#b81d1d] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)" }}
                  >
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)" }}
                  >
                    <FastForward className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Skip</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNextQuiz}
                    disabled={matchedPairs.size !== matchColumns.left.length || matchColumns.left.length === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)" }}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-4 h-4 sm:ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.left.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedSpeakerMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[0] === pattern);
                    return (
                      <MatchButton
                        key={`speaker-${pattern}`}
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleSpeakerMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                      >
                        <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
                      </MatchButton>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.right.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedLetterMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[1] === pattern);
                    return (
                      <MatchButton
                        key={`pattern-${pattern}`}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleLetterMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                        className="font-black text-2xl sm:text-3xl tracking-widest"
                      >
                        {pattern}
                      </MatchButton>
                    );
                  })}
                </div>
              </div>
              {wrongMatchPair && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg mb-4 text-center">Not quite, try again!</motion.p>
              )}
            </motion.div>"""

content = content.replace(') : !showConfetti && currentPhase === "patterns" ? (', match_phase_ui + '\n          ) : !showConfetti && currentPhase === "patterns" ? (')

# 3. Fix Patterns Phase Controls (Remove Back, change to Shuffle)
old_patterns_controls = """              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  What Sound is this? 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the correct long vowel name 2 times out loud.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
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
                </Button>"""

new_patterns_controls = """              <div className="text-center mb-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the correct long vowel name 2 times out loud.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePatterns(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>"""

content = content.replace(old_patterns_controls, new_patterns_controls)

# 4. Remove Vowel Team Subtitle in Patterns Phase
content = content.replace("""                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-0">
                            {p.name}
                          </span>""", "")

# 5. Fix Words Phase Controls (Remove Back, change to Shuffle, Remove Subtitles)
old_words_controls = """              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Words! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say each long word out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
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
                </Button>"""

new_words_controls = """              <div className="text-center mb-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say each long word out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveWords(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>"""

content = content.replace(old_words_controls, new_words_controls)

content = content.replace("""                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1 sm:mt-0">
                            Long {w.vowel}
                          </span>""", "")

# 6. Fix Sentences Phase Controls
old_sentences_controls = """              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Sentences! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the whole sentence loud and clear.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
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
                </Button>"""

new_sentences_controls = """              <div className="text-center mb-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the whole sentence loud and clear.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSentences(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>"""

content = content.replace(old_sentences_controls, new_sentences_controls)


with open('src/app/components/LevelLongVowels.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
