const https = require('https');
const fs = require('fs');
const path = require('path');

const modelName = 'Xenova/wav2vec2-base-960h';
const baseUrl = `https://huggingface.co/${modelName}/resolve/main/`;
const targetDir = path.join(__dirname, 'public', 'models', modelName);

const filesToDownload = [
  'config.json',
  'preprocessor_config.json',
  'tokenizer_config.json',
  'tokenizer.json',
  'vocab.json',
  'onnx/model_quantized.onnx' // We use the quantized version to save space (approx 90MB)
];

// Ensure directories exist
function ensureDir(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(dest);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function start() {
  console.log(`Downloading ${modelName} to local system...`);
  console.log(`Target Directory: ${targetDir}\n`);

  for (const file of filesToDownload) {
    const url = baseUrl + file;
    const dest = path.join(targetDir, file);
    console.log(`Downloading: ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`✅ Success: ${file}`);
    } catch (err) {
      console.error(`❌ Error downloading ${file}:`, err.message);
    }
  }
  console.log('\n🎉 All downloads finished!');
  console.log('You can now run the app completely offline.');
}

start();
