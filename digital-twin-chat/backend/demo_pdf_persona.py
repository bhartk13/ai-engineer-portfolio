"""
Demo script showing PDF persona in action
"""
from dotenv import load_dotenv
from persona_loader import PersonaLoader

load_dotenv()

def main():
    print("=" * 70)
    print("Digital Twin Chat - PDF Persona Demo")
    print("=" * 70)
    print()
    
    # Load persona
    loader = PersonaLoader()
    persona = loader.load_persona()
    
    # Display statistics
    print("📄 Persona Statistics:")
    print(f"   Source: linkedin.pdf")
    print(f"   Characters: {len(persona):,}")
    print(f"   Words: {len(persona.split()):,}")
    print(f"   Lines: {len(persona.splitlines()):,}")
    print()
    
    # Show first part
    print("📝 Persona Content (first 800 characters):")
    print("-" * 70)
    print(persona[:800])
    print("-" * 70)
    print()
    
    # Extract key information
    lines = persona.split('\n')
    print("🔍 Key Information Extracted:")
    
    # Try to find name
    for line in lines[:10]:
        if line.strip() and len(line.strip()) > 2 and len(line.strip()) < 50:
            if not any(keyword in line.lower() for keyword in ['summary', 'experience', 'education', 'skills']):
                print(f"   Name: {line.strip()}")
                break
    
    # Try to find email
    for line in lines:
        if '@' in line and '.' in line:
            email = line.strip()
            if len(email) < 100:
                print(f"   Email: {email}")
                break
    
    print()
    print("✅ PDF persona loaded successfully!")
    print("   The digital twin will use this information to respond as you.")
    print()
    print("🚀 Server is running at: http://localhost:8000")
    print("   API Docs: http://localhost:8000/docs")
    print()

if __name__ == "__main__":
    main()
