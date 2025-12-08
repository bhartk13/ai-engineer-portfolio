"""
Verification script for local development setup

This script checks that all required components are in place for local development.
Run this before starting the server to ensure everything is configured correctly.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def check_environment():
    """Check environment configuration"""
    print("🔍 Checking Environment Configuration...")
    
    env = os.getenv("ENVIRONMENT", "local")
    if env == "local":
        print(f"  ✓ ENVIRONMENT set to 'local'")
        return True
    else:
        print(f"  ⚠️  ENVIRONMENT is '{env}' (expected 'local')")
        return False


def check_dependencies():
    """Check that required Python packages are installed"""
    print("\n🔍 Checking Python Dependencies...")
    
    # Map package names to their import names
    required_packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
        ("python-dotenv", "dotenv"),
        ("boto3", "boto3"),
        ("openai", "openai"),
        ("hypothesis", "hypothesis"),
        ("pytest", "pytest")
    ]
    
    all_installed = True
    for package_name, import_name in required_packages:
        try:
            __import__(import_name)
            print(f"  ✓ {package_name}")
        except ImportError:
            print(f"  ✗ {package_name} (not installed)")
            all_installed = False
    
    return all_installed


def check_directories():
    """Check that required directories exist"""
    print("\n🔍 Checking Directories...")
    
    local_storage = Path(os.getenv("LOCAL_STORAGE_PATH", "./local_storage"))
    
    if local_storage.exists():
        print(f"  ✓ Local storage directory: {local_storage}")
        return True
    else:
        print(f"  ✗ Local storage directory missing: {local_storage}")
        return False


def check_files():
    """Check that required files exist"""
    print("\n🔍 Checking Required Files...")
    
    all_exist = True
    
    # Check persona file
    persona_path = Path(os.getenv("LOCAL_PERSONA_PATH", "./me.txt"))
    if persona_path.exists():
        print(f"  ✓ Persona file: {persona_path}")
        size = persona_path.stat().st_size
        print(f"    Size: {size} bytes")
    else:
        print(f"  ✗ Persona file missing: {persona_path}")
        all_exist = False
    
    # Check .env file
    env_file = Path(".env")
    if env_file.exists():
        print(f"  ✓ Environment file: {env_file}")
    else:
        print(f"  ⚠️  .env file missing (will use defaults)")
    
    # Check main application files
    required_files = [
        "main.py",
        "models.py",
        "persona_loader.py",
        "memory_manager.py",
        "llm_client.py",
        "run_local.py"
    ]
    
    for file in required_files:
        file_path = Path(file)
        if file_path.exists():
            print(f"  ✓ {file}")
        else:
            print(f"  ✗ {file} (missing)")
            all_exist = False
    
    return all_exist


def check_api_key():
    """Check if API key is configured"""
    print("\n🔍 Checking API Configuration...")
    
    llm_provider = os.getenv("LLM_PROVIDER", "openai")
    print(f"  LLM Provider: {llm_provider}")
    
    if llm_provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key and api_key != "your-openai-api-key-here":
            print(f"  ✓ OpenAI API key configured (length: {len(api_key)})")
            return True
        else:
            print(f"  ✗ OpenAI API key not configured")
            print(f"    Set OPENAI_API_KEY in .env file")
            return False
    elif llm_provider == "bedrock":
        print(f"  ℹ️  Using AWS Bedrock (requires AWS credentials)")
        return True
    else:
        print(f"  ⚠️  Unknown LLM provider: {llm_provider}")
        return False


def main():
    """Run all verification checks"""
    print("=" * 60)
    print("Digital Twin Chat - Setup Verification")
    print("=" * 60)
    print()
    
    checks = [
        ("Environment", check_environment()),
        ("Dependencies", check_dependencies()),
        ("Directories", check_directories()),
        ("Files", check_files()),
        ("API Key", check_api_key())
    ]
    
    print("\n" + "=" * 60)
    print("Verification Summary")
    print("=" * 60)
    
    all_passed = True
    for name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:10} {name}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n✅ All checks passed! You're ready to run the server.")
        print("\nTo start the server, run:")
        print("  python run_local.py")
        return 0
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")
        print("\nRefer to LOCAL_DEVELOPMENT.md for setup instructions.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
