import os
import re

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove activeMatchBatch state declaration
content = re.sub(r'  const \[activeMatchBatch, setActiveMatchBatch\] = useState.*?;[\r\n]+', '', content)

# 2. Fix the Step display string
content = content.replace('`Step ${matchIdx + 1}/${activeMatchBatch.length}`', '`Step ${matchedPairs.size}/${matchColumns.left.length}`')

# 3. Replace the old match UI block
match_ui_start = r'\) : !showConfetti && currentPhase === "match" && activeMatchBatch\.length > 0 \? \('
match_ui_end = r'\) : !showConfetti && currentPhase === "words" \? \('

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
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <ShuffleIcon className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button 
                    onClick={setupMatchPhase} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#e11d48] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
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
            </motion.div>
          ) : !showConfetti && currentPhase === "words" ? ("""

content = re.sub(match_ui_start + r'.*?' + match_ui_end, new_match_ui, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done. Replaced UI!")
