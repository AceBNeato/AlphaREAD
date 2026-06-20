import os

# 1. Update LevelLongVowels.tsx
filepath = 'src/app/components/LevelLongVowels.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_grid = 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch mb-8 flex-1"'
new_grid = 'className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${activeVowelData.patterns.length === 1 ? \'grid-cols-1 max-w-sm\' : activeVowelData.patterns.length === 2 ? \'grid-cols-1 md:grid-cols-2 max-w-2xl\' : \'grid-cols-1 md:grid-cols-2 lg:grid-cols-3\'}`}'

if old_grid in content:
    content = content.replace(old_grid, new_grid)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

# 2. Update LevelBlends.tsx
filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# in LevelBlends.tsx it's filteredData[reviewIdx]?.patterns
new_grid_blends = 'className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${(filteredData[reviewIdx]?.patterns.length || 0) === 1 ? \'grid-cols-1 max-w-sm\' : (filteredData[reviewIdx]?.patterns.length || 0) === 2 ? \'grid-cols-1 md:grid-cols-2 max-w-2xl\' : \'grid-cols-1 md:grid-cols-2 lg:grid-cols-3\'}`}'

if old_grid in content:
    content = content.replace(old_grid, new_grid_blends)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

print("Done centering grids.")
