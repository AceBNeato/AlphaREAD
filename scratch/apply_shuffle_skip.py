import os
import re

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add reviewBatch state
state_code = """  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; category: string; name: string; words: BlendWord[] }[] = [];
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, category: d.name, name: p.name, words: p.words });
      });
    });
    return list;
  }, [filteredData]);

  const [reviewBatch, setReviewBatch] = useState<{ pattern: string; category: string; name: string; words: BlendWord[] }[]>([]);

  useEffect(() => {
    if (currentPhase === "review") {
      setReviewBatch(allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);"""

content = re.sub(r'  const allPatternsRaw = useMemo\(\(\) => \{.*?\}, \[filteredData\]\);', state_code, content, flags=re.DOTALL)


# 2. Replace Back button with Shuffle in Review Phase
old_back_btn = """                  <Button
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
                  </Button>"""

new_shuffle_btn = """                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewBatch(prev => shuffle([...prev]))}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{
                      background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)",
                    }}
                  >
                    <ShuffleIcon className="w-4 h-4 mr-1" /> Shuffle
                  </Button>"""

content = content.replace(old_back_btn, new_shuffle_btn)

# 3. Replace allPatternsRaw.slice with reviewBatch in Review Phase render
content = content.replace("allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).length", "reviewBatch.length")
content = content.replace("allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6).map", "reviewBatch.map")

# 4. Add Skip button to Match Phase
old_match_controls = """                {/* Navigation Controls */}
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
                </div>"""

new_match_controls = """                {/* Navigation Controls */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
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
                  <Button 
                    onClick={handleSkip} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>
                </div>"""

content = content.replace(old_match_controls, new_match_controls)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Review Shuffle and Match Skip!")
