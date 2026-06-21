import os

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_match_ui = """          ) : !showConfetti && currentPhase === "match" && activeMatchBatch.length > 0 ? (
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
                  onClick={() => playPatternAudio(activeMatchBatch[matchIdx].pattern, activeMatchBatch[matchIdx].category)}
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
                  const isCorrectTarget = opt.pattern === activeMatchBatch[matchIdx].pattern;
                  
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
                            if (matchIdx < activeMatchBatch.length - 1) {
                              setMatchIdx(m => m + 1);
                            } else {
                              setShowConfetti(true);
                              playSound("complete");
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
            </motion.div>"""

new_match_ui = """          ) : !showConfetti && currentPhase === "match" && matchColumns.left.length > 0 ? (
            <motion.div
              key={`phase-match-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full"
            >
              <div className="text-center mb-6">
                <p className="text-gray-500 mt-2">Tap a speaker, then tap the matching blend!</p>
                
                {/* Navigation Controls */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button 
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <ShuffleIcon className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button 
                    onClick={setupMatchPhase} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: Speakers */}
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

                {/* Right Column: Blends */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.right.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedLetterMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[1] === pattern);

                    return (
                      <MatchButton
                        key={`letter-${pattern}`}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleLetterMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                        className="font-black text-2xl sm:text-3xl"
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

content = content.replace(old_match_ui, new_match_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced Match UI successfully!")
