# Audio Generation - Quick Start

## 🚀 Fastest Way to Generate Audio

### Windows
```bash
setup_and_generate_audio.bat
```

### Linux/Mac
```bash
chmod +x setup_and_generate_audio.sh
./setup_and_generate_audio.sh
```

## ⚡ Manual Steps

### 1. Install Dependencies
```bash
pip install boto3
```

### 2. Configure AWS (First Time Only)
```bash
aws configure
```
Enter your AWS credentials when prompted.

### 3. Generate Audio
```bash
python generate_audio_polly.py
```

### 4. Rebuild App
```bash
npm run build
```

### 5. Test
```bash
npm run dev
```
Open http://localhost:5173/

## 📋 What You Need

- ✅ Python 3.7+
- ✅ AWS Account
- ✅ AWS Access Key & Secret Key
- ✅ Internet connection

## 💰 Cost

**~$0.01** (essentially free with AWS free tier)

## 🎵 What Gets Generated

- 42 character audio files (vowels + consonants)
- 34 word audio files (animals, colors, numbers, family)
- 18 phrase audio files (greetings, questions)

**Total: 94 high-quality MP3 files**

## ❓ Need Help?

See **AUDIO_GENERATION_GUIDE.md** for detailed instructions.

## 🔧 Troubleshooting

### "Unable to locate credentials"
Run: `aws configure`

### "AccessDeniedException"
Your AWS user needs Polly permissions. Contact your AWS admin.

### "Command not found: aws"
Install AWS CLI: https://aws.amazon.com/cli/

## ✨ Features

- Uses AWS Polly Neural engine (highest quality)
- Aditi voice (native Hindi speaker)
- Automatic file organization
- Progress tracking
- Error handling
