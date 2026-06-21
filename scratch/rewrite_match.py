import os

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import MatchButton
content = content.replace('import { playSound } from "../utils/soundEffects";', 
                          'import { MatchButton } from "./MatchButton";\nimport { playSound } from "../utils/soundEffects";')

# 2. Replace match state variables and effects
old_match_state = """  // Match Phase State
  const [matchIdx, setMatchIdx] = useState(0);
  const [matchOptions, setMatchOptions] = useState<{ pattern: string; category: string; name: string; words: BlendWord[] }[]>([]);
  const [showMatchFeedback, setShowMatchFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (currentPhase === "match") {
      const batch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
      setActiveMatchBatch(shuffle([...batch]));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);

  useEffect(() => {
    if (currentPhase === "match" && activeMatchBatch.length > 0) {
      const current = activeMatchBatch[matchIdx];
      if (!current) return;
      const others = allPatternsRaw.filter(p => p.pattern !== current.pattern);
      const randomOthers = shuffle(others).slice(0, 2);
      setMatchOptions(shuffle([current, ...randomOthers]));

      // Auto play on new question
      setTimeout(() => playPatternAudio(current.pattern, current.category), 500);
    }
  }, [currentPhase, matchIdx, activeMatchBatch, allPatternsRaw]);"""

new_match_state = """  // Match Phase State
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  const setupMatchPhase = useCallback(() => {
    const currentBatch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
    const targets = currentBatch.map(p => p.pattern);
    setMatchColumns({
      left: shuffle([...targets]),
      right: shuffle([...targets])
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  }, [allPatternsRaw, reviewIdx]);

  useEffect(() => {
    if (currentPhase === "match") {
      setupMatchPhase();
    }
  }, [currentPhase, setupMatchPhase]);

  const checkMatch = useCallback((speaker: string, letter: string) => {
    if (speaker === letter) {
      playSound("correct", 0.4);
      setMatchedPairs(prev => {
        const next = new Set(prev).add(speaker);
        if (next.size === matchColumns.left.length && matchColumns.left.length > 0) {
          setShowConfetti(true);
          playSound("complete");
        }
        return next;
      });
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([speaker, letter]);
      setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 1000);
    }
  }, [matchColumns.left.length]);

  const handleSpeakerMatchClick = (pattern: string) => {
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    const cat = allPatternsRaw.find(p => p.pattern === pattern)?.category || "";
    playPatternAudio(pattern, cat);
    if (selectedSpeakerMatch === pattern) {
      setSelectedSpeakerMatch(null);
    } else {
      setSelectedSpeakerMatch(pattern);
      if (selectedLetterMatch) {
        checkMatch(pattern, selectedLetterMatch);
      }
    }
  };

  const handleLetterMatchClick = (pattern: string) => {
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    if (selectedLetterMatch === pattern) {
      setSelectedLetterMatch(null);
    } else {
      setSelectedLetterMatch(pattern);
      if (selectedSpeakerMatch) {
        checkMatch(selectedSpeakerMatch, pattern);
      }
    }
  };"""

content = content.replace(old_match_state, new_match_state)

# 3. Update handleShuffle
old_shuffle = """    if (currentPhase === "match") {
      setActiveMatchBatch(prev => shuffle([...prev]));
    }"""

new_shuffle = """    if (currentPhase === "match") {
      setMatchColumns(prev => ({
        left: shuffle([...prev.left]),
        right: shuffle([...prev.right])
      }));
    }"""

content = content.replace(old_shuffle, new_shuffle)

# 4. Update handleReset
old_reset = """    if (currentPhase === "match") {
      setCompletedPatterns(new Set());
      setPatternFeedbackMap({});
      setPatternTranscriptsMap({});
      setPatternIdx(0);
    }"""

new_reset = """    if (currentPhase === "match") {
      setupMatchPhase();
    }"""

content = content.replace(old_reset, new_reset)

# 5. Update handleSkip
old_skip = """    if (currentPhase === "match") {
      setCompletedPatterns(new Set(activeMatchBatch.map(p => p.pattern)));
      handleNextQuiz();
    }"""

new_skip = """    if (currentPhase === "match") {
      setMatchedPairs(new Set(matchColumns.left));
      setShowConfetti(true);
      playSound("complete");
    }"""

content = content.replace(old_skip, new_skip)

# 6. Update step counter header display in Match phase
content = content.replace('Step {matchIdx + 1}/{activeMatchBatch.length}', 'Step {matchedPairs.size}/{matchColumns.left.length}')

# 7. Update Confetti button click (remove setMatchIdx(0))
content = content.replace('setMatchIdx(0);', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Partially replaced states and functions.")
