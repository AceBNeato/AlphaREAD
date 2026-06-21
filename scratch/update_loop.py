import re

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update WORDS_PER_SET and SENTENCES_PER_SET
content = content.replace('const WORDS_PER_SET = 10;', 'const WORDS_PER_SET = 6;')
content = content.replace('const SENTENCES_PER_SET = 10;', 'const SENTENCES_PER_SET = 6;')

# 2. Add activeMatchBatch state and remove old activePatterns
content = content.replace('const [activePatterns, setActivePatterns] = useState(() => shuffle([...allPatternsRaw]));', 
                          'const [activeMatchBatch, setActiveMatchBatch] = useState<{ pattern: string; category: string; name: string; words: BlendWord[] }[]>([]);')

# 3. Add effect to shuffle batch on match phase enter
effect_code = """  useEffect(() => {
    if (currentPhase === "match") {
      const batch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
      setActiveMatchBatch(shuffle([...batch]));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);

  useEffect(() => {
    if (currentPhase === "match" && activeMatchBatch.length > 0) {
      const current = activeMatchBatch[matchIdx];"""

content = content.replace("""  useEffect(() => {
    if (currentPhase === "match" && activePatterns.length > 0) {
      const current = activePatterns[matchIdx];""", effect_code)

content = content.replace('activePatterns[matchIdx].pattern', 'activeMatchBatch[matchIdx].pattern')
content = content.replace('activePatterns[matchIdx].category', 'activeMatchBatch[matchIdx].category')
content = content.replace('activePatterns.length', 'activeMatchBatch.length')
content = content.replace('activePatterns, allPatternsRaw]);', 'activeMatchBatch, allPatternsRaw]);')

# 4. Update the confetti button logic to loop
confetti_button_old = """              <Button
                onClick={() => {
                  setCurrentPhase("words");
                  setShowConfetti(false);
                }}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
              >
                Start Voice Evaluation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>"""

confetti_button_new = """              <Button
                onClick={() => {
                  setShowConfetti(false);
                  if (reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1) {
                    setReviewIdx(r => r + 1);
                    setMatchIdx(0);
                    setCurrentPhase("review");
                  } else {
                    setCurrentPhase("words");
                  }
                }}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
              >
                {reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1 ? "Next Batch " : "Start Voice Evaluation "} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>"""

content = content.replace(confetti_button_old, confetti_button_new)

# 5. Fix `currentPhase === "match" && activePatterns.length > 0` condition in Match UI render
content = content.replace('currentPhase === "match" && activePatterns.length > 0', 'currentPhase === "match" && activeMatchBatch.length > 0')

# Also in the Review phase, the text says `Step ${reviewIdx + 1}/${Math.ceil(allPatternsRaw.length / 6)}`
# And in the Match phase it said `Step ${matchIdx + 1}/${activePatterns.length}`
# We replaced `activePatterns.length` with `activeMatchBatch.length` already.
# So `Step ${matchIdx + 1}/${activeMatchBatch.length}` is fine.
# But wait, in the Match phase, the text in the header could be clearer?
# "Step 1/6" is fine since it's testing the 6 patterns.

# Remove the unused `activePatterns` variable if it's anywhere else.
content = content.replace('activePatterns', 'activeMatchBatch')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated batch loop flow.")
