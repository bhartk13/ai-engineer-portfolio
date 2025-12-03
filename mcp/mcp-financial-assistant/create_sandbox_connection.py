"""
Create a test Plaid connection in Sandbox mode using Plaid's sandbox API
This bypasses the OAuth flow for testing purposes
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.config import PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
from app.services.plaid_service import exchange_public_token, plaid_client

def create_sandbox_connection(user_id: str = "user1", institution_id: str = "ins_109508"):
    """
    Create a test Plaid connection using Sandbox API
    
    Args:
        user_id: User ID to create connection for
        institution_id: Plaid institution ID (default: ins_109508 = Chase)
    
    Common test institution IDs:
        - ins_109508: Chase
        - ins_109509: Bank of America  
        - ins_109510: Wells Fargo
        - ins_109511: Citi
        - ins_3: First Platypus Bank (Plaid test bank)
    """
    if not plaid_client:
        print("❌ Plaid client not initialized. Check your API keys.")
        return False
    
    if PLAID_ENV.upper() not in ['SANDBOX', 'DEVELOPMENT']:
        print(f"⚠️  Warning: This script is for Sandbox only. Current env: {PLAID_ENV}")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return False
    
    print(f"Creating Sandbox connection for user: {user_id}")
    print(f"Institution ID: {institution_id}")
    print("-" * 50)
    
    try:
        # Step 1: Create a sandbox public token
        print("\n1. Creating sandbox public token...")
        response = plaid_client.sandbox_public_token_create({
            'institution_id': institution_id,
            'initial_products': ['transactions', 'auth']
        })
        public_token = response['public_token']
        print(f"✅ Public token created: {public_token[:30]}...")
        
        # Step 2: Exchange for access token
        print("\n2. Exchanging public token for access token...")
        result = exchange_public_token(public_token, user_id)
        
        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return False
        
        print(f"✅ {result.get('message')}")
        print(f"   Item ID: {result.get('item_id')}")
        print(f"   Institution: {result.get('institution_name')}")
        
        print("\n" + "="*50)
        print("✅ SUCCESS! Plaid connection created.")
        print("="*50)
        print(f"\nYou can now use: @fintech show my accounts")
        print(f"Or run: python app/main.py")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Parse arguments
    user_id = "user1"
    institution_id = "ins_109508"  # Chase by default
    
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
    if len(sys.argv) > 2:
        institution_id = sys.argv[2]
    
    print("\n" + "="*50)
    print("Plaid Sandbox Connection Creator")
    print("="*50)
    
    success = create_sandbox_connection(user_id, institution_id)
    
    if success:
        print("\n✅ Done! Your test connection is ready.")
    else:
        print("\n❌ Failed to create connection.")
        sys.exit(1)
