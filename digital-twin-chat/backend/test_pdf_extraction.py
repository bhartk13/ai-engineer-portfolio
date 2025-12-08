"""
Test script to verify PDF extraction works correctly
"""
from persona_loader import PersonaLoader

def test_pdf_extraction():
    print("Testing PDF extraction...")
    print("=" * 60)
    
    loader = PersonaLoader()
    
    try:
        persona_content = loader.load_persona()
        
        print(f"✓ Successfully loaded persona from PDF")
        print(f"  Total characters: {len(persona_content):,}")
        print(f"  Total words: {len(persona_content.split()):,}")
        print(f"  Total lines: {len(persona_content.splitlines()):,}")
        print()
        print("First 500 characters:")
        print("-" * 60)
        print(persona_content[:500])
        print("-" * 60)
        print()
        print("Last 500 characters:")
        print("-" * 60)
        print(persona_content[-500:])
        print("-" * 60)
        
    except Exception as e:
        print(f"✗ Error loading persona: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_extraction()
