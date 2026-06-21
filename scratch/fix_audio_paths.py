import os
import re

filepath = 'src/app/components/LevelBlends.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_func = """  const playPatternAudio = useCallback((pattern: string, category: string) => {
    let folder = "";
    if (category === "3-Letter Blends") {
      folder = "3letterblend";
    } else if (category === "Ending Blends") {
      folder = "longend";
    } else {
      folder = "2letterblend";
    }
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/${folder}/${folder}-${pattern}.mp3`);
    audio.play().catch(e => console.error(e));
  }, []);"""

new_func = """  const playPatternAudio = useCallback((pattern: string, category: string) => {
    // Explicit mapping to resolve filesystem naming inconsistencies
    const audioMap: Record<string, string> = {
      "bl": "2letterblend/2letterblend-bl",
      "br": "2letterblend/2letterblend-br",
      "ch": "2letterblend/2letterblend-ch",
      "cl": "2letterblend/2letterblend-cl",
      "cr": "2letterblend/2letterblend-cr",
      "dr": "2letterblend/2letterblend-dr",
      "fl": "2letterblend/2letterblend-fl",
      "fr": "2letterblend/2letterblend-fr",
      "ft": "2letterblend/2letterblend-ft",
      "gl": "2letterblend/2letterblend-gl",
      "gr": "2letterblend/2letterblend-gr",
      "ph": "2letterblend/2letterblend-ph",
      "pl": "2letterblend/2letterblend-pl",
      "pr": "2letterblend/2letterblend-pr",
      "sh": "2letterblend/2letterblend-sh",
      "sm": "2letterblend/2letterblend-sm",
      "sn": "2letterblend/2letterblend-sn",
      "sp": "2letterblend/2letterblend-sp",
      "st": "2letterblend/2letterblend-st",
      "sw": "2letterblend/2letterblend-sw",
      "th(d)": "2letterblend/2letterblend-th(d)",
      "th(t)": "2letterblend/2letterblend-th(t)",
      "tr": "2letterblend/2letterblend-tr",
      "tw": "2letterblend/2letterblend-tw",
      "ld": "longend/longend-ld",
      "lt": "longend/longend-lt",
      "mp": "longend/longend-mp",
      "nd": "longend/longend-nd",
      "nt": "longend/longend-nt",
      "sc": "longend/longend-sc",
      "sk": "longend/longend-sk",
      "sl": "longend/longend-sl",
      "shr": "3letterblend/3letterblend-shr",
      "scr": "3letterblend/3letterblend-skr", // Note: skr instead of scr in filesystem
      "spl": "3letterblend/3letterblend-spl",
      "spr": "3letterblend/3letterblend-spr",
      "squ": "3letterblend/3letterblend-squ",
      "str": "3letterblend/3letterblend-str",
      "ng": "longend/longend-ng" // Placeholder for when the user adds it
    };

    const location = audioMap[pattern];
    if (location) {
      const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/${location}.mp3`);
      audio.play().catch(e => console.error("Audio playback failed:", e));
    } else {
      console.warn(`No audio mapping found for pattern: ${pattern}`);
    }
  }, []);"""

content = content.replace(old_func, new_func)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced playPatternAudio successfully!")
