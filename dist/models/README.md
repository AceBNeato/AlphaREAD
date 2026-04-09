# Vosk Models

This directory should contain Vosk speech recognition models.

## Download Instructions

1. Download the English small model from: https://alphacephei.com/vosk/models
2. Extract the model to this directory
3. Ensure the folder structure is: `/models/vosk-model-small-en-us-0.15/`

## Model Files Needed

- `am/final.mdl`
- `conf/mfcc.conf`
- `graph/phones/word_boundary.int`
- `graph/HCLr.fst`
- `graph/Gr.fst`
- `graph/Disambig.fst`

## Alternative Models

You can also use other Vosk models:
- `vosk-model-small-en-us-0.15` (recommended for this app)
- `vosk-model-en-us-0.22` (larger, more accurate)
- `vosk-model-tiny-en-us-0.15` (smaller, faster but less accurate)
