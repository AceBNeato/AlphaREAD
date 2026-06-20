import os

filepath = 'src/app/components/LevelBlends.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Top Headers
old_top_headers = '''            {currentPhase === "review" && `Long ${filteredData[reviewIdx]?.name} Review`}
            {currentPhase === "patterns" && `${categoryFilter || "Blends"} - Voice Evaluation`}
            {currentPhase === "words" && `Words Quiz (Set ${wordSetIdx + 1}/${totalWordSets})`}'''

new_top_headers = '''            {currentPhase === "review" && `Long ${filteredData[reviewIdx]?.name} Review`}
            {currentPhase === "patterns" && `${categoryFilter || "Blends"} - Voice Evaluation`}
            {currentPhase === "words" && `${categoryFilter || "Blends"} - Voice Evaluation`}
            {currentPhase === "sentences" && `Long ${categoryFilter || "Blends"} : Read the Sentences`}'''

content = content.replace(old_top_headers, new_top_headers)


# 2. Erase "Read the Words! 🗣️" section in words phase
words_header = '''              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Words! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say each long word out loud into the microphone.
                </p>
              </div>'''
content = content.replace(words_header, '')


# 3. Erase "Read the Sentences! 🗣️" section in sentences phase
sentences_header = '''              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Sentences! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Read the sentence out loud into the microphone.
                </p>
              </div>'''
content = content.replace(sentences_header, '')


# 4. Erase `<span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-0">{p.name}</span>`
pattern_name_span = '''                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 sm:mt-0">
                            {p.name}
                          </span>'''
content = content.replace(pattern_name_span, '')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied UI modifications to LevelBlends.tsx")
