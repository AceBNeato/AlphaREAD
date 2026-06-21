import os

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('currentPhase === "patterns"', 'currentPhase === "match"')
content = content.replace('currentPhase !== "patterns"', 'currentPhase !== "match"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned up remaining 'patterns' references!")
