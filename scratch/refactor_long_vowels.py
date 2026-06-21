import re

with open('src/app/components/LevelLongVowels.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update allPatternsRaw to include words and add reviewBatch state
old_patterns_state = """  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; vowel: string; name: string }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, vowel: d.vowel, name: p.name });
      });
    });
    return list;
  }, []);
  const [activePatterns, setActivePatterns] = useState(() => {
    // Pick exactly 1 random pattern per vowel to keep the list at 5 items
    const selected: { pattern: string; vowel: string; name: string }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      const p = d.patterns[Math.floor(Math.random() * d.patterns.length)];
      selected.push({ pattern: p.pattern, vowel: d.vowel, name: p.name });
    });
    return shuffle(selected);
  });"""

new_patterns_state = """  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; vowel: string; name: string; words: LongVowelWord[] }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, vowel: d.vowel, name: p.name, words: p.words });
      });
    });
    return list;
  }, []);

  const [reviewBatch, setReviewBatch] = useState<{ pattern: string; vowel: string; name: string; words: LongVowelWord[] }[]>([]);

  useEffect(() => {
    if (currentPhase === "review" || currentPhase === "match" || currentPhase === "patterns") {
      setReviewBatch(allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);"""
content = content.replace(old_patterns_state, new_patterns_state)

# 2. Update WORDS_PER_SET and SENTENCES_PER_SET
content = content.replace("const WORDS_PER_SET = 10;", "const WORDS_PER_SET = 6;")
content = content.replace("const SENTENCES_PER_SET = 10;", "const SENTENCES_PER_SET = 6;")

# 3. Update setupMatchPhase
old_setup = """  const setupMatchPhase = useCallback(() => {
    // Generate match pairs
    const pairs: string[] = [];
    const shuffledPatterns = shuffle([...allPatternsRaw]).slice(0, 5);
    shuffledPatterns.forEach(p => pairs.push(p.pattern));
    
    setMatchColumns({
      left: shuffle([...pairs]),
      right: shuffle([...pairs])
    });"""

new_setup = """  const setupMatchPhase = useCallback(() => {
    // Generate match pairs
    const pairs: string[] = [];
    const currentBatch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
    currentBatch.forEach(p => pairs.push(p.pattern));
    
    setMatchColumns({
      left: shuffle([...pairs]),
      right: shuffle([...pairs])
    });"""
content = content.replace(old_setup, new_setup)

# 4. Fix Review Phase Render
old_review_phase = """        <AnimatePresence mode="wait">
          {!showConfetti && currentPhase === "review" && activeVowelData ? (
            <motion.div
              key={`phase-review-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >

              <div className="text-center mb-8">
                <p className="text-gray-500 mt-2">
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
                      className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                      style={{
                        background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                      }}
                    >
                      Proceed <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>


              <div className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${activeVowelData.patterns.length === 1 ? 'grid-cols-1 max-w-sm' : activeVowelData.patterns.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {activeVowelData.patterns.map((pattern) => {"""

new_review_phase = """        <AnimatePresence mode="wait">
          {!showConfetti && currentPhase === "review" ? (
            <motion.div
              key={`phase-review-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >

              <div className="text-center mb-8">
                <p className="text-gray-500 mt-2">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewBatch(prev => shuffle([...prev]))}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{
                      background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)",
                    }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPhase("match")}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{
                      background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                    }}
                  >
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>


              <div className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${reviewBatch.length === 1 ? 'grid-cols-1 max-w-sm' : reviewBatch.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {reviewBatch.map((pattern) => {"""
content = content.replace(old_review_phase, new_review_phase)

# 5. Fix "patterns" (Voice Eval) Phase Render
content = content.replace("disabled={completedPatterns.size < activePatterns.length}", "disabled={completedPatterns.size < reviewBatch.length}")
content = content.replace("{activePatterns.map((p, idx) => {", "{reviewBatch.map((p, idx) => {")
content = content.replace("setCompletedPatterns(new Set(activePatterns.map(p => p.pattern)));", "setCompletedPatterns(new Set(reviewBatch.map(p => p.pattern)));")

# 6. Fix Confetti Transitions
old_patterns_confetti = """              ) : currentPhase === "patterns" ? (
                <Button
                  onClick={() => {
                    setCurrentPhase("words");
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{
                    background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                  }}
                >
                  Proceed to Words <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : currentPhase === "words" ? ("""

new_patterns_confetti = """              ) : currentPhase === "patterns" ? (
                reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1 ? (
                  <Button
                    onClick={() => {
                      setReviewIdx(r => r + 1);
                      setCurrentPhase("review");
                      setShowConfetti(false);
                      setCompletedPatterns(new Set());
                      setPatternFeedbackMap({});
                      setPatternTranscriptsMap({});
                    }}
                    size="lg"
                    className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                    style={{
                      background: "linear-gradient(135deg, rgb(139, 64, 184) 0%, rgb(165, 89, 214) 100%)",
                    }}
                  >
                    Next Batch <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setCurrentPhase("words");
                      setShowConfetti(false);
                    }}
                    size="lg"
                    className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                    style={{
                      background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                    }}
                  >
                    Proceed to Words <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )
              ) : currentPhase === "words" ? ("""
content = content.replace(old_patterns_confetti, new_patterns_confetti)

# 7. Fix the Header (replace hardcoded step 1/5 with proper progress)
old_header = """          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {currentPhase === "review" && `Long Vowels Review`}
            {currentPhase === "match" && `Long Vowels - Listen & Match`}
            {currentPhase === "patterns" && `Long Vowels - Voice Evaluation`}
            {currentPhase === "words" && `Long Vowels - Voice Evaluation`}
            {currentPhase === "sentences" && `Long Vowels : Read the Sentences`}
          </h2>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>
            {currentPhase === "review" && `Step 1/5`}
            {currentPhase === "match" && `Step 2/5`}
            {currentPhase === "patterns" && `Step 3/5`}
            {currentPhase === "words" && `Step 4/5`}
            {currentPhase === "sentences" && `Step 5/5`}
          </span>"""

new_header = """          <div className="flex-1 w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-1 px-1">
              <h2 className="text-lg font-bold tracking-tight text-center flex-1 text-left" style={{ color: accent.primary }}>
                {currentPhase === "review" && `Long Vowels Review`}
                {currentPhase === "match" && `Listen & Match`}
                {currentPhase === "patterns" && `Voice Evaluation`}
                {currentPhase === "words" && `Read the Words`}
                {currentPhase === "sentences" && `Read the Sentences`}
              </h2>
              <span className="text-sm font-bold" style={{ color: accent.primary }}>
                {currentPhase === "review" || currentPhase === "match" || currentPhase === "patterns"
                  ? `Batch ${reviewIdx + 1} of ${Math.ceil(allPatternsRaw.length / 6)}`
                  : currentPhase === "words"
                  ? `Set ${wordSetIdx + 1} of ${totalWordSets}`
                  : `Set ${sentenceSetIdx + 1} of ${totalSentenceSets}`}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 w-full max-w-[200px] sm:max-w-none ml-auto">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${accent.primary}, ${accent.lightBg})` }}
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    currentPhase === "review"
                      ? ((reviewIdx * 3) / (Math.ceil(allPatternsRaw.length / 6) * 3)) * 100
                      : currentPhase === "match"
                      ? (((reviewIdx * 3) + 1 + (matchedPairs.size / reviewBatch.length)) / (Math.ceil(allPatternsRaw.length / 6) * 3)) * 100
                      : currentPhase === "patterns"
                      ? (((reviewIdx * 3) + 2 + (completedPatterns.size / reviewBatch.length)) / (Math.ceil(allPatternsRaw.length / 6) * 3)) * 100
                      : currentPhase === "words"
                      ? ((wordSetIdx) / totalWordSets) * 100
                      : ((sentenceSetIdx) / totalSentenceSets) * 100
                  }%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>"""
content = content.replace(old_header, new_header)

# Remove unused `activeVowelData = LONG_VOWELS_DATA[reviewIdx];` if it exists
content = re.sub(r'\s*const activeVowelData = LONG_VOWELS_DATA\[reviewIdx\];\s*', '\n', content)

with open('src/app/components/LevelLongVowels.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied Long Vowels Refactoring!")
