export interface BlendWord { word: string; highlights: number[]; }
export interface BlendPattern { name: string; pattern: string; words: BlendWord[]; }
export interface BlendCategory { name: string; patterns: BlendPattern[]; }

export const BLENDS_DATA: BlendCategory[] = [
  {
    "name": "2-Letter Blends",
    "patterns": [
      {
        "name": "2-Letter Blend",
        "pattern": "bl",
        "words": [
          { word: "bless", highlights: [0, 1] },
          { word: "blade", highlights: [0, 1] },
          { word: "blame", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "br",
        "words": [
          { word: "brave", highlights: [0, 1] },
          { word: "broke", highlights: [0, 1] },
          { word: "bride", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "cl",
        "words": [
          { word: "clean", highlights: [0, 1] },
          { word: "close", highlights: [0, 1] },
          { word: "clay", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "cr",
        "words": [
          { word: "crane", highlights: [0, 1] },
          { word: "crab", highlights: [0, 1] },
          { word: "crude", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "dr",
        "words": [
          { word: "drive", highlights: [0, 1] },
          { word: "dream", highlights: [0, 1] },
          { word: "drone", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "fl",
        "words": [
          { word: "flame", highlights: [0, 1] },
          { word: "flute", highlights: [0, 1] },
          { word: "flag", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "fr",
        "words": [
          { word: "frame", highlights: [0, 1] },
          { word: "free", highlights: [0, 1] },
          { word: "freeze", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "gl",
        "words": [
          { word: "globe", highlights: [0, 1] },
          { word: "glide", highlights: [0, 1] },
          { word: "glad", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "gr",
        "words": [
          { word: "green", highlights: [0, 1] },
          { word: "grape", highlights: [0, 1] },
          { word: "grass", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "pl",
        "words": [
          { word: "play", highlights: [0, 1] },
          { word: "plane", highlights: [0, 1] },
          { word: "plate", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "pr",
        "words": [
          { word: "price", highlights: [0, 1] },
          { word: "prize", highlights: [0, 1] },
          { word: "pride", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sc",
        "words": [
          { word: "scale", highlights: [0, 1] },
          { word: "score", highlights: [0, 1] },
          { word: "scope", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sk",
        "words": [
          { word: "skin", highlights: [0, 1] },
          { word: "skate", highlights: [0, 1] },
          { word: "skip", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sl",
        "words": [
          { word: "slap", highlights: [0, 1] },
          { word: "slide", highlights: [0, 1] },
          { word: "slow", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sm",
        "words": [
          { word: "smile", highlights: [0, 1] },
          { word: "smoke", highlights: [0, 1] },
          { word: "smear", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sn",
        "words": [
          { word: "snake", highlights: [0, 1] },
          { word: "snail", highlights: [0, 1] },
          { word: "snore", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sp",
        "words": [
          { word: "spot", highlights: [0, 1] },
          { word: "space", highlights: [0, 1] },
          { word: "spell", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "st",
        "words": [
          { word: "stone", highlights: [0, 1] },
          { word: "state", highlights: [0, 1] },
          { word: "steam", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "sw",
        "words": [
          { word: "sweet", highlights: [0, 1] },
          { word: "sweat", highlights: [0, 1] },
          { word: "sway", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "tr",
        "words": [
          { word: "tree", highlights: [0, 1] },
          { word: "train", highlights: [0, 1] },
          { word: "trade", highlights: [0, 1] }
        ]
      },
      {
        "name": "2-Letter Blend",
        "pattern": "tw",
        "words": [
          { word: "twice", highlights: [0, 1] },
          { word: "twigs", highlights: [0, 1] },
          { word: "tweet", highlights: [0, 1] }
        ]
      }
    ]
  },
  {
    "name": "Digraphs",
    "patterns": [
      {
        "name": "Digraph",
        "pattern": "ch",
        "words": [
          { word: "chair", highlights: [0, 1] },
          { word: "cheese", highlights: [0, 1] },
          { word: "chase", highlights: [0, 1] }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "sh",
        "words": [
          { word: "shop", highlights: [0, 1] },
          { word: "sheep", highlights: [0, 1] },
          { word: "shape", highlights: [0, 1] }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "th(d)",
        "words": [
          { word: "these", highlights: [0, 1] },
          { word: "this", highlights: [0, 1] },
          { word: "those", highlights: [0, 1] }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "th(t)",
        "words": [
          { word: "theme", highlights: [0, 1] },
          { word: "thief", highlights: [0, 1] },
          { word: "thigh", highlights: [0, 1] }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "wh",
        "words": [
          { word: "whale", highlights: [0, 1] },
          { word: "white", highlights: [0, 1] },
          { word: "wheel", highlights: [0, 1] }
        ]
      },
      {
        "name": "Digraph",
        "pattern": "ph",
        "words": [
          { word: "phone", highlights: [0, 1] },
          { word: "photo", highlights: [0, 1] },
          { word: "phase", highlights: [0, 1] }
        ]
      }
    ]
  },
  {
    "name": "Three-Letter Blends",
    "patterns": [
      {
        "name": "Three-Letter Blend",
        "pattern": "str",
        "words": [
          { word: "street", highlights: [0, 1, 2] },
          { word: "string", highlights: [0, 1, 2] },
          { word: "stripe", highlights: [0, 1, 2] }
        ]
      },
      {
        "name": "Three-Letter Blend",
        "pattern": "spl",
        "words": [
          { word: "splat", highlights: [0, 1, 2] },
          { word: "split", highlights: [0, 1, 2] },
          { word: "splice", highlights: [0, 1, 2] }
        ]
      },
      {
        "name": "Three-Letter Blend",
        "pattern": "spr",
        "words": [
          { word: "spread", highlights: [0, 1, 2] },
          { word: "sprout", highlights: [0, 1, 2] },
          { word: "spray", highlights: [0, 1, 2] }
        ]
      },
      {
        "name": "Three-Letter Blend",
        "pattern": "scr",
        "words": [
          { word: "scrape", highlights: [0, 1, 2] },
          { word: "screen", highlights: [0, 1, 2] },
          { word: "scram", highlights: [0, 1, 2] }
        ]
      },
      {
        "name": "Three-Letter Blend",
        "pattern": "squ",
        "words": [
          { word: "square", highlights: [0, 1, 2] },
          { word: "squid", highlights: [0, 1, 2] },
          { word: "squeak", highlights: [0, 1, 2] }
        ]
      },
      {
        "name": "Three-Letter Blend",
        "pattern": "shr",
        "words": [
          { word: "shrank", highlights: [0, 1, 2] },
          { word: "shrub", highlights: [0, 1, 2] },
          { word: "shred", highlights: [0, 1, 2] }
        ]
      }
    ]
  },
  {
    "name": "Ending Blends",
    "patterns": [
      {
        "name": "Ending Blend",
        "pattern": "ng",
        "words": [
          { word: "ring", highlights: [2, 3] },
          { word: "sing", highlights: [2, 3] },
          { word: "king", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "nd",
        "words": [
          { word: "hand", highlights: [2, 3] },
          { word: "sand", highlights: [2, 3] },
          { word: "land", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "nt",
        "words": [
          { word: "plant", highlights: [3, 4] },
          { word: "grant", highlights: [3, 4] },
          { word: "paint", highlights: [3, 4] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "st",
        "words": [
          { word: "fast", highlights: [2, 3] },
          { word: "last", highlights: [2, 3] },
          { word: "past", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "mp",
        "words": [
          { word: "lamp", highlights: [2, 3] },
          { word: "camp", highlights: [2, 3] },
          { word: "stamp", highlights: [3, 4] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "sk",
        "words": [
          { word: "task", highlights: [2, 3] },
          { word: "disk", highlights: [2, 3] },
          { word: "risk", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "lt",
        "words": [
          { word: "volt", highlights: [2, 3] },
          { word: "melt", highlights: [2, 3] },
          { word: "belt", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "ld",
        "words": [
          { word: "cold", highlights: [2, 3] },
          { word: "gold", highlights: [2, 3] },
          { word: "wild", highlights: [2, 3] }
        ]
      },
      {
        "name": "Ending Blend",
        "pattern": "ft",
        "words": [
          { word: "craft", highlights: [3, 4] },
          { word: "draft", highlights: [3, 4] },
          { word: "left", highlights: [2, 3] }
        ]
      }
    ]
  }
]
  ;


export const BLENDS_SENTENCES: string[] = [
  "The frog is green.",
  "She has a blue dress.",
  "I like to swim and play.",
  "The crab is on the sand.",
  "He will scrub the floor.",
  "The shrimp is small.",
  "We planted a tree in the grass.",
  "The train is on the track.",
  "Look at the stars in the sky.",
  "The clown has a big smile.",
  "She has a pink shell.",
  "The cheese is in the chair.",
  "I think this is a thumb.",
  "The whale swims in the sea.",
  "I took a photo with my phone.",
  "The street is strong.",
  "Splash the water!",
  "Spring is a fun season.",
  "Scratch the screen.",
  "The squirrel eats nuts.",
  "Shrink the shirt.",
  "I bend my hand.",
  "Send the tent to the camp.",
  "The wind will blow.",
  "Run fast to the past.",
  "Jump on the stump.",
  "The lamp is on the desk.",
  "Ask for a task.",
  "The ice will melt.",
  "The gold is cold.",
  "Lift the heavy box."
];
