#!/usr/bin/env python3
"""
Regenerate a single audio file using AWS Polly
"""

import boto3
from pathlib import Path

# Configuration
POLLY_VOICE_ID = 'Aditi'
POLLY_ENGINE = 'standard'
POLLY_LANGUAGE = 'hi-IN'

# Text and output path
TEXT = 'अः'  # ah
OUTPUT_PATH = Path(__file__).parent / 'public' / 'audio' / 'vowels' / 'ah.mp3'

def generate_audio():
    """Generate audio file using AWS Polly"""
    try:
        # Initialize Polly client
        polly = boto3.Session().client('polly', region_name='us-east-1')
        
        print(f"🎵 Generating audio for: {TEXT}")
        print(f"📁 Output: {OUTPUT_PATH}")
        
        # Request speech synthesis
        response = polly.synthesize_speech(
            Text=TEXT,
            OutputFormat='mp3',
            VoiceId=POLLY_VOICE_ID,
            Engine=POLLY_ENGINE,
            LanguageCode=POLLY_LANGUAGE
        )
        
        # Save the audio stream to file
        if 'AudioStream' in response:
            OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(OUTPUT_PATH, 'wb') as file:
                file.write(response['AudioStream'].read())
            
            # Check file size
            file_size = OUTPUT_PATH.stat().st_size
            print(f"✅ Success! File size: {file_size} bytes")
            return True
        else:
            print("❌ No audio stream in response")
            return False
            
    except Exception as error:
        print(f"❌ Error: {error}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("Regenerating ah.mp3")
    print("=" * 60)
    success = generate_audio()
    print("=" * 60)
    if success:
        print("✅ Done! Now run: npm run build")
    else:
        print("❌ Failed to generate audio")
