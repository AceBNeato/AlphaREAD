import json

with open('src/app/components/LevelLongVowels.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add MatchButton import
content = content.replace(
    'import { AudioVisualizer } from "./AudioVisualizer";',
    'import { AudioVisualizer } from "./AudioVisualizer";\nimport { MatchButton } from "./MatchButton";'
)

# 2. Add 'match' to Phase type
content = content.replace(
    'type Phase = "review" | "patterns" | "words" | "sentences";',
    'type Phase = "review" | "match" | "patterns" | "words" | "sentences";'
)

# 3. Insert Match Phase State and functions
match_state = """
  // Match Phase State
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  const setupMatchPhase = useCallback(() => {
    // Generate match pairs
    const pairs: string[] = [];
    const shuffledPatterns = shuffle([...allPatternsRaw]).slice(0, 5);
    shuffledPatterns.forEach(p => pairs.push(p.pattern));
    
    setMatchColumns({
      left: shuffle([...pairs]),
      right: shuffle([...pairs])
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  }, [allPatternsRaw]);

  useEffect(() => {
    if (currentPhase === "match") {
      setupMatchPhase();
    }
  }, [currentPhase, setupMatchPhase]);

  const checkMatch = useCallback((speaker: string, letter: string) => {
    if (speaker === letter) {
      playSound("correct", 0.4);
      setMatchedPairs(prev => new Set(prev).add(speaker));
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      if (matchedPairs.size + 1 === matchColumns.left.length) {
        setShowConfetti(true);
      }
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([speaker, letter]);
      setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 1000);
    }
  }, [matchColumns.left.length, matchedPairs.size]);

  const handleSpeakerMatchClick = (pattern: string) => {
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    playTTS(pattern);
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
  };
"""

content = content.replace('// Voice Eval States', match_state + '\n  // Voice Eval States')

# 4. Modify handleBack, handleReset, handleSkip, handleNextQuiz
content = content.replace(
    'if (currentPhase === "patterns" || currentPhase === "words" || currentPhase === "sentences") {',
    'if (currentPhase === "match" || currentPhase === "patterns" || currentPhase === "words" || currentPhase === "sentences") {'
)

content = content.replace(
    'else if (currentPhase === "patterns") setCurrentPhase("review");',
    'else if (currentPhase === "patterns") setCurrentPhase("match");\n    else if (currentPhase === "match") setCurrentPhase("review");'
)

content = content.replace(
    'if (currentPhase === "patterns") {\n      setCompletedPatterns(new Set());',
    'if (currentPhase === "match") {\n      setupMatchPhase();\n    } else if (currentPhase === "patterns") {\n      setCompletedPatterns(new Set());'
)

content = content.replace(
    'if (currentPhase === "patterns") {\n      setCompletedPatterns(new Set(activePatterns.map(p => p.pattern)));\n      handleNextQuiz();',
    'if (currentPhase === "match") {\n      setMatchedPairs(new Set(matchColumns.left));\n      handleNextQuiz();\n    } else if (currentPhase === "patterns") {\n      setCompletedPatterns(new Set(activePatterns.map(p => p.pattern)));\n      handleNextQuiz();'
)

# 5. Fix padding
content = content.replace('pb-12 flex flex-col', 'flex flex-col')
content = content.replace('px-4 py-8 flex-1', 'px-4 py-4 flex-1')

# 6. Fix header titles and step badge
content = content.replace(
    '{currentPhase === "review" && `Long ${VOWELS[reviewIdx]} Review`}',
    '{currentPhase === "review" && `Long Vowels Review`}\n            {currentPhase === "match" && `Listen & Match`}'
)

content = content.replace(
    '{currentPhase === "patterns" && `All Vowel Patterns Quiz`}',
    '{currentPhase === "patterns" && `Say the Name`}'
)
content = content.replace(
    '{currentPhase === "words" && `Words Quiz (Set ${wordSetIdx + 1}/${totalWordSets})`}',
    '{currentPhase === "words" && `Read the Words`}\n            {currentPhase === "sentences" && `Read the Sentences`}'
)

content = content.replace(
    '<span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">',
    '<span className="text-sm font-bold" style={{ color: accent.primary }}>'
)
content = content.replace(
    '{currentPhase === "review" && `Vowel ${reviewIdx + 1}/5`}',
    '{currentPhase === "review" && `Step 1/5`}\n            {currentPhase === "match" && `Step 2/5`}'
)
content = content.replace(
    '{currentPhase === "patterns" && `${patternIdx + 1}/${activePatterns.length}`}',
    '{currentPhase === "patterns" && `Step 3/5`}'
)
content = content.replace(
    '{currentPhase === "words" && `${wordIdx + 1}/${activeWords.length}`}',
    '{currentPhase === "words" && `Step 4/5`}\n            {currentPhase === "sentences" && `Step 5/5`}'
)

with open('src/app/components/LevelLongVowels_step1.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
