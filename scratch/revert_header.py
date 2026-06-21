import re

with open('src/app/components/LevelLongVowels.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_header_block = """          <div className="flex-1 w-full max-w-2xl mx-auto">
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

new_header_block = """          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
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

content = content.replace(old_header_block, new_header_block)

with open('src/app/components/LevelLongVowels.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted Header Successfully!")
