#!/usr/bin/env python3
"""
Generate Hindi audio files using AWS Polly
This script reads the data files and generates MP3 audio for each item
"""

import json
import boto3
import os
from pathlib import Path
from botocore.exceptions import BotoCoreError, ClientError

# AWS Polly configuration
POLLY_VOICE_ID = 'Aditi'  # Hindi female voice
POLLY_ENGINE = 'standard'  # Use standard engine (Aditi doesn't support neural)
POLLY_LANGUAGE = 'hi-IN'  # Hindi (India)

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / 'src' / 'data'
AUDIO_DIR = SCRIPT_DIR / 'public' / 'audio'

def init_polly_client():
    """Initialize AWS Polly client"""
    try:
        # Try to use credentials from environment or AWS config
        session = boto3.Session()
        polly = session.client('polly', region_name='us-east-1')
        
        # Test the connection
        polly.describe_voices(LanguageCode=POLLY_LANGUAGE)
        print("✅ Successfully connected to AWS Polly")
        return polly
    except Exception as e:
        print(f"❌ Error connecting to AWS Polly: {e}")
        print("\nPlease configure AWS credentials:")
        print("1. Set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")
        print("2. Or run: aws configure")
        print("3. Or create ~/.aws/credentials file")
        return None

def generate_audio(polly_client, text, output_path, voice_id=POLLY_VOICE_ID):
    """
    Generate audio file using AWS Polly
    
    Args:
        polly_client: Boto3 Polly client
        text: Text to convert to speech
        output_path: Path to save the MP3 file
        voice_id: Polly voice ID to use
    """
    try:
        # Request speech synthesis
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            Engine=POLLY_ENGINE,
            LanguageCode=POLLY_LANGUAGE
        )
        
        # Save the audio stream to file
        if 'AudioStream' in response:
            with open(output_path, 'wb') as file:
                file.write(response['AudioStream'].read())
            return True
        else:
            print(f"❌ No audio stream in response for: {text}")
            return False
            
    except (BotoCoreError, ClientError) as error:
        print(f"❌ Error generating audio for '{text}': {error}")
        return False

def generate_character_audio(polly_client):
    """Generate audio for all Hindi characters"""
    print("\n📝 Generating character audio files...")
    
    # Load characters data
    with open(DATA_DIR / 'characters.json', 'r', encoding='utf-8') as f:
        characters = json.load(f)
    
    success_count = 0
    total_count = len(characters)
    
    for char in characters:
        hindi_char = char['hindi']
        audio_file = char['audioFile'].lstrip('/')  # Remove leading slash
        output_path = SCRIPT_DIR / 'public' / audio_file
        
        # Create directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate audio
        print(f"  Generating: {hindi_char} ({char['romanization']}) -> {audio_file}")
        if generate_audio(polly_client, hindi_char, output_path):
            success_count += 1
        else:
            print(f"    ⚠️ Failed to generate audio for {hindi_char}")
    
    print(f"✅ Generated {success_count}/{total_count} character audio files")
    return success_count, total_count

def generate_word_audio(polly_client):
    """Generate audio for all Hindi words"""
    print("\n📚 Generating word audio files...")
    
    # Load words data
    with open(DATA_DIR / 'words.json', 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    success_count = 0
    total_count = len(words)
    
    for word in words:
        hindi_word = word['hindi']
        audio_file = word['audioFile'].lstrip('/')
        output_path = SCRIPT_DIR / 'public' / audio_file
        
        # Create directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate audio
        print(f"  Generating: {hindi_word} ({word['english']}) -> {audio_file}")
        if generate_audio(polly_client, hindi_word, output_path):
            success_count += 1
        else:
            print(f"    ⚠️ Failed to generate audio for {hindi_word}")
    
    print(f"✅ Generated {success_count}/{total_count} word audio files")
    return success_count, total_count

def generate_phrase_audio(polly_client):
    """Generate audio for all Hindi phrases"""
    print("\n💬 Generating phrase audio files...")
    
    # Load phrases data
    with open(DATA_DIR / 'phrases.json', 'r', encoding='utf-8') as f:
        phrases = json.load(f)
    
    success_count = 0
    total_count = len(phrases)
    
    for phrase in phrases:
        hindi_phrase = phrase['hindi']
        audio_file = phrase['audioFile'].lstrip('/')
        output_path = SCRIPT_DIR / 'public' / audio_file
        
        # Create directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate audio
        print(f"  Generating: {hindi_phrase} ({phrase['english']}) -> {audio_file}")
        if generate_audio(polly_client, hindi_phrase, output_path):
            success_count += 1
        else:
            print(f"    ⚠️ Failed to generate audio for {hindi_phrase}")
    
    print(f"✅ Generated {success_count}/{total_count} phrase audio files")
    return success_count, total_count

def main():
    """Main function to generate all audio files"""
    print("=" * 60)
    print("🎵 Hindi Learning App - Audio Generator using AWS Polly")
    print("=" * 60)
    
    # Initialize Polly client
    polly_client = init_polly_client()
    if not polly_client:
        print("\n❌ Cannot proceed without AWS Polly connection")
        return
    
    print(f"\n🎙️ Using voice: {POLLY_VOICE_ID} ({POLLY_LANGUAGE})")
    print(f"🔧 Engine: {POLLY_ENGINE}")
    
    # Generate all audio files
    char_success, char_total = generate_character_audio(polly_client)
    word_success, word_total = generate_word_audio(polly_client)
    phrase_success, phrase_total = generate_phrase_audio(polly_client)
    
    # Summary
    total_success = char_success + word_success + phrase_success
    total_files = char_total + word_total + phrase_total
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"Characters: {char_success}/{char_total}")
    print(f"Words:      {word_success}/{word_total}")
    print(f"Phrases:    {phrase_success}/{phrase_total}")
    print(f"TOTAL:      {total_success}/{total_files}")
    print("=" * 60)
    
    if total_success == total_files:
        print("✅ All audio files generated successfully!")
    else:
        print(f"⚠️ {total_files - total_success} files failed to generate")
    
    print("\n💡 Next steps:")
    print("1. Run 'npm run build' to rebuild the application")
    print("2. Test the audio in your browser")
    print("3. The audio files are in public/audio/")

if __name__ == '__main__':
    main()
