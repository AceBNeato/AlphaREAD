import os
import shutil
from optimum.onnxruntime import ORTModelForCTC
from onnxruntime.quantization import quantize_dynamic, QuantType
from transformers import AutoFeatureExtractor, AutoTokenizer
import requests

# 1. Setup Paths
model_id = "facebook/wav2vec2-lv-60-espeak-cv-ft"
out_dir = "public/models/wav2vec2-phoneme"
temp_dir = "temp_onnx_export"
onnx_dir = os.path.join(out_dir, "onnx")

# We ONLY clean the temp export folder - NOT the output dir
# This preserves your existing tokenizer.json and vocab.json!
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir, exist_ok=True)
os.makedirs(onnx_dir, exist_ok=True)

# 2. Export the Raw Model from HuggingFace (~380MB)
print(f"Step 1/3: Downloading and exporting {model_id} as ONNX...")
print("  (This will take a few minutes and requires ~1GB of disk space temporarily)")
model = ORTModelForCTC.from_pretrained(model_id, export=True)
model.save_pretrained(temp_dir)
del model  # Release file handle BEFORE quantization (critical on Windows)
print("  Raw ONNX export complete!")

# 3. Smart Quantization
# Skips 'Conv' layers which cause Windows file-locking crashes.
# Targets MatMul/Gather/Add which hold most of the weight data.
# Expected result: ~90-110MB (from 380MB)
raw_model_path = os.path.join(temp_dir, "model.onnx")
quantized_model_path = os.path.join(onnx_dir, "model_quantized.onnx")

print(f"\nStep 2/3: Applying Smart Quantization (skipping Conv layers)...")
print(f"  Input:  {raw_model_path} ({os.path.getsize(raw_model_path)/1024/1024:.1f} MB)")

quantize_dynamic(
    model_input=raw_model_path,
    model_output=quantized_model_path,
    weight_type=QuantType.QUInt8,
    op_types_to_quantize=['MatMul', 'Gather', 'Add']
)

print(f"  Output: {quantized_model_path} ({os.path.getsize(quantized_model_path)/1024/1024:.1f} MB)")
print("  Quantization complete!")

# 4. Save updated configs (preserves existing tokenizer.json)
print("\nStep 3/3: Saving feature extractor and tokenizer configs...")
feature_extractor = AutoFeatureExtractor.from_pretrained(model_id)
feature_extractor.save_pretrained(out_dir)

files_to_download = [
    "tokenizer.json",
    "special_tokens_map.json",
    "tokenizer_config.json",
    "vocab.json"
]
print("  Downloading tokenizer files directly from Hugging Face...")
for file_name in files_to_download:
    url = f"https://huggingface.co/{model_id}/raw/main/{file_name}"
    response = requests.get(url)
    if response.status_code == 200:
        with open(os.path.join(out_dir, file_name), 'wb') as f:
            f.write(response.content)
        print(f"    Downloaded {file_name}")
    else:
        print(f"    Warning: Could not download {file_name}")

# Copy config.json only if not already present
config_dst = os.path.join(out_dir, "config.json")
config_src = os.path.join(temp_dir, "config.json")
if os.path.exists(config_src):
    shutil.copy(config_src, config_dst)
    print("  config.json updated.")

# 5. Cleanup temp folder
print("\nCleaning up temp files...")
try:
    shutil.rmtree(temp_dir)
    print("  Temp folder removed.")
except Exception as e:
    print(f"  Warning: Could not remove temp folder: {e}")
    print("  You can safely delete 'temp_onnx_export' manually.")

original_size = os.path.getsize(os.path.join(onnx_dir, "model_quantized.onnx")) / 1024 / 1024
print(f"\n{'='*50}")
print(f"  ALL DONE!")
print(f"  Quantized model size: {original_size:.1f} MB")
print(f"  Location: {onnx_dir}/model_quantized.onnx")
print(f"{'='*50}")
print("\nNext step: The app already uses 'quantized: true' in vosk.ts,")
print("so it will automatically pick up this smaller model!")
print("Run: npm run build && npx cap sync android")