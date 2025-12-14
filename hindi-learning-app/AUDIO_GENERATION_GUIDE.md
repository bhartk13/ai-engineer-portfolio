# Audio Generation Guide - AWS Polly

This guide explains how to generate real Hindi audio files using AWS Polly for the Hindi Learning App.

## Overview

The `generate_audio_polly.py` script uses AWS Polly's neural text-to-speech engine with the **Aditi** voice (Hindi female) to generate high-quality audio files for:
- 42 Hindi characters (vowels and consonants)
- 34 Hindi words
- 18 Hindi phrases

**Total:** 94 audio files

## Prerequisites

### 1. AWS Account
You need an AWS account with access to Amazon Polly.

### 2. AWS Credentials
Configure your AWS credentials using one of these methods:

#### Option A: AWS CLI (Recommended)
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

#### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

On Windows (PowerShell):
```powershell
$env:AWS_ACCESS_KEY_ID="your-access-key"
$env:AWS_SECRET_ACCESS_KEY="your-secret-key"
$env:AWS_DEFAULT_REGION="us-east-1"
```

#### Option C: AWS Credentials File
Create `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key
```

### 3. Python Dependencies
Install required packages:
```bash
pip install -r audio-generation-requirements.txt
```

Or install directly:
```bash
pip install boto3
```

## Usage

### Generate All Audio Files

```bash
cd hindi-learning-app
python generate_audio_polly.py
```

The script will:
1. Connect to AWS Polly
2. Read data from `src/data/*.json` files
3. Generate MP3 files for each item
4. Save files to `public/audio/` directory
5. Show progress and summary

### Expected Output

```
============================================================
🎵 Hindi Learning App - Audio Generator using AWS Polly
============================================================
✅ Successfully connected to AWS Polly

🎙️ Using voice: Aditi (hi-IN)
🔧 Engine: neural

📝 Generating character audio files...
  Generating: अ (a) -> audio/vowels/a.mp3
  Generating: आ (aa) -> audio/vowels/aa.mp3
  ...
✅ Generated 42/42 character audio files

📚 Generating word audio files...
  Generating: कुत्ता (Dog) -> audio/words/dog.mp3
  ...
✅ Generated 34/34 word audio files

💬 Generating phrase audio files...
  Generating: नमस्ते (Hello) -> audio/phrases/namaste.mp3
  ...
✅ Generated 18/18 phrase audio files

============================================================
📊 SUMMARY
============================================================
Characters: 42/42
Words:      34/34
Phrases:    18/18
TOTAL:      94/94
============================================================
✅ All audio files generated successfully!
```

## AWS Polly Configuration

### Voice Settings
- **Voice ID:** Aditi (Hindi female voice)
- **Language:** hi-IN (Hindi - India)
- **Engine:** Neural (higher quality than standard)
- **Output Format:** MP3

### Alternative Voices
AWS Polly supports multiple Hindi voices. To use a different voice, edit `generate_audio_polly.py`:

```python
POLLY_VOICE_ID = 'Aditi'  # Change to another Hindi voice
```

Available Hindi voices:
- **Aditi** (Female, Neural) - Recommended
- **Kajal** (Female, Neural) - Alternative

## Cost Estimation

AWS Polly Neural pricing (as of 2024):
- **$16.00 per 1 million characters**
- First 1 million characters per month are free (12 months for new accounts)

For this project:
- Approximate total characters: ~500-1000 characters
- **Estimated cost: $0.01 - $0.02** (essentially free with free tier)

## Troubleshooting

### Error: "Unable to locate credentials"
**Solution:** Configure AWS credentials (see Prerequisites above)

### Error: "An error occurred (AccessDeniedException)"
**Solution:** Ensure your AWS IAM user has Polly permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech",
        "polly:DescribeVoices"
      ],
      "Resource": "*"
    }
  ]
}
```

### Error: "Could not connect to the endpoint URL"
**Solution:** Check your AWS region setting. Try `us-east-1` or your preferred region.

### Some files failed to generate
**Solution:** 
- Check the error messages for specific failures
- Verify the Hindi text in JSON files is valid UTF-8
- Try running the script again (it will skip existing files)

## After Generation

### 1. Rebuild the Application
```bash
npm run build
```

### 2. Test the Audio
```bash
npm run dev
# Open http://localhost:5173/
```

### 3. Verify Audio Files
Check that files exist and have reasonable sizes:
```bash
# On Windows
dir public\audio\vowels
dir public\audio\consonants
dir public\audio\words
dir public\audio\phrases

# On Linux/Mac
ls -lh public/audio/vowels/
ls -lh public/audio/consonants/
ls -lh public/audio/words/
ls -lh public/audio/phrases/
```

Expected file sizes: 5-50 KB per file (depending on text length)

## File Structure

After generation:
```
public/audio/
├── vowels/
│   ├── a.mp3
│   ├── aa.mp3
│   └── ... (12 files)
├── consonants/
│   ├── ka.mp3
│   ├── kha.mp3
│   └── ... (30 files)
├── words/
│   ├── dog.mp3
│   ├── cat.mp3
│   └── ... (34 files)
└── phrases/
    ├── namaste.mp3
    ├── dhanyavaad.mp3
    └── ... (18 files)
```

## Advanced Usage

### Generate Only Characters
Edit the script and comment out word/phrase generation:
```python
# In main() function:
char_success, char_total = generate_character_audio(polly_client)
# word_success, word_total = generate_word_audio(polly_client)
# phrase_success, phrase_total = generate_phrase_audio(polly_client)
```

### Use Different Voice
```python
# At the top of the script:
POLLY_VOICE_ID = 'Kajal'  # Alternative Hindi voice
```

### Change Audio Quality
```python
# For standard engine (lower cost):
POLLY_ENGINE = 'standard'

# For neural engine (higher quality):
POLLY_ENGINE = 'neural'
```

## Notes

- The script will **overwrite** existing audio files
- Audio files are saved directly to `public/audio/` (not `dist/`)
- Run `npm run build` after generation to copy files to `dist/`
- Generated files are real MP3 audio, not placeholders
- Audio quality is high (neural engine)
- Files are optimized for web playback

## Support

For AWS Polly documentation:
- [AWS Polly Documentation](https://docs.aws.amazon.com/polly/)
- [Supported Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)
- [Pricing](https://aws.amazon.com/polly/pricing/)

For issues with this script:
- Check AWS credentials configuration
- Verify IAM permissions
- Check network connectivity
- Review error messages in console output
