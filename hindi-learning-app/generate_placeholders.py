#!/usr/bin/env python3
"""
Generate placeholder audio and image files for the Hindi learning app.
This creates minimal files that allow the app to function without actual content.
"""

import os
import json

# Read the data files to get all required assets
def read_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# Create a minimal MP3 file (silent audio)
def create_placeholder_audio(filepath):
    """Create a minimal valid MP3 file with silence"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    # This is a minimal valid MP3 file (about 0.026 seconds of silence)
    # ID3v2 header + minimal MP3 frame
    mp3_data = bytes([
        0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
    with open(filepath, 'wb') as f:
        f.write(mp3_data)
    print(f"Created audio: {filepath}")

# Create a placeholder SVG image
def create_placeholder_image(filepath, text, color="#4ECDC4"):
    """Create a colorful SVG placeholder image"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="{color}" rx="20"/>
  <text x="100" y="100" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">{text}</text>
</svg>'''
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created image: {filepath}")

def main():
    base_dir = os.path.dirname(__file__)
    public_dir = os.path.join(base_dir, 'public')
    
    # Read data files
    characters = read_json(os.path.join(base_dir, 'src', 'data', 'characters.json'))
    words = read_json(os.path.join(base_dir, 'src', 'data', 'words.json'))
    phrases = read_json(os.path.join(base_dir, 'src', 'data', 'phrases.json'))
    
    print("Generating placeholder audio files...")
    
    # Create audio files for characters
    for char in characters:
        audio_path = os.path.join(public_dir, char['audioFile'].lstrip('/'))
        create_placeholder_audio(audio_path)
    
    # Create audio files for words
    for word in words:
        audio_path = os.path.join(public_dir, word['audioFile'].lstrip('/'))
        create_placeholder_audio(audio_path)
    
    # Create audio files for phrases
    for phrase in phrases:
        audio_path = os.path.join(public_dir, phrase['audioFile'].lstrip('/'))
        create_placeholder_audio(audio_path)
    
    print("\nGenerating placeholder image files...")
    
    # Create image files for words
    color_map = {
        'animals': '#FF6B6B',
        'colors': '#4ECDC4',
        'numbers': '#45B7D1',
        'family': '#FFA07A'
    }
    
    for word in words:
        image_path = os.path.join(public_dir, word['imageFile'].lstrip('/'))
        # Convert path to PNG if needed
        if image_path.endswith('.png'):
            image_path = image_path[:-4] + '.svg'
            # Update the extension in the original path for consistency
        color = color_map.get(word['category'], '#4ECDC4')
        create_placeholder_image(image_path, word['english'], color)
    
    print("\n✅ All placeholder files created successfully!")
    print("\nNote: These are placeholder files. Replace them with actual audio recordings")
    print("and images for a complete learning experience.")

if __name__ == '__main__':
    main()
