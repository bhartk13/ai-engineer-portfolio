"""
Local development server runner

This script sets up and starts the FastAPI backend for local development.
It ensures all necessary directories and files are in place before starting.

Requirements: 4.1, 4.4, 4.5
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def setup_local_environment():
    """
    Set up local development environment
    - Create local storage directory if it doesn't exist
    - Verify persona file exists
    - Validate environment configuration
    """
    print("=" * 60)
    print("Digital Twin Chat - Local Development Setup")
    print("=" * 60)
    
    # Get configuration
    local_storage_path = os.getenv("LOCAL_STORAGE_PATH", "./local_storage")
    local_persona_path = os.getenv("LOCAL_PERSONA_PATH", "./me.txt")
    environment = os.getenv("ENVIRONMENT", "local")
    
    # Validate environment is set to local
    if environment != "local":
        print(f"⚠️  Warning: ENVIRONMENT is set to '{environment}' but should be 'local'")
        print("   Continuing anyway, but AWS services may be attempted.")
    
    # Create local storage directory
    storage_dir = Path(local_storage_path)
    if not storage_dir.exists():
        print(f"📁 Creating local storage directory: {storage_dir}")
        storage_dir.mkdir(parents=True, exist_ok=True)
    else:
        print(f"✓ Local storage directory exists: {storage_dir}")
    
    # Check persona file
    persona_file = Path(local_persona_path)
    if not persona_file.exists():
        print(f"⚠️  Warning: Persona file not found: {persona_file}")
        print("   The application will fail when trying to load the persona.")
        print("   Please create a persona file (me.txt or linkedin.pdf).")
    else:
        file_extension = persona_file.suffix.lower()
        print(f"✓ Persona file exists: {persona_file}")
        print(f"  File type: {file_extension}")
        
        # Show preview for text files only
        if file_extension == '.txt':
            try:
                with open(persona_file, 'r', encoding='utf-8') as f:
                    content = f.read(100)
                    print(f"  Preview: {content}...")
            except Exception as e:
                print(f"  Could not preview file: {e}")
        elif file_extension == '.pdf':
            file_size = persona_file.stat().st_size
            print(f"  PDF size: {file_size:,} bytes")
        else:
            print(f"  Note: Unrecognized file type, will attempt to read as text")
    
    # Check for API key
    llm_provider = os.getenv("LLM_PROVIDER", "openai")
    if llm_provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key == "your-openai-api-key-here":
            print(f"⚠️  Warning: OPENAI_API_KEY not configured in .env file")
            print("   The application will fail when trying to generate responses.")
            print("   Please set your OpenAI API key in the .env file.")
        else:
            print(f"✓ OpenAI API key configured (length: {len(api_key)})")
    
    print("=" * 60)
    print()
    
    return True


if __name__ == "__main__":
    # Set up local environment
    try:
        setup_local_environment()
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)
    
    # Start the server
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    print(f"🚀 Starting Digital Twin Chat API")
    print(f"   Host: {host}:{port}")
    print(f"   Environment: {os.getenv('ENVIRONMENT', 'local')}")
    print(f"   Log Level: {log_level}")
    print(f"   API Documentation: http://localhost:{port}/docs")
    print(f"   Interactive API: http://localhost:{port}/redoc")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    print()
    
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=True,
            log_level=log_level
        )
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n\n❌ Server error: {e}")
        sys.exit(1)
