from pathlib import Path

def create_sample_documents():
    data_dir = Path("./data")
    data_dir.mkdir(exist_ok=True)
    
    docs = {
        "business_hours.txt": """BUSINESS HOURS: Mon-Fri 9AM-6PM EST, Sat 10AM-4PM EST, Sun Closed
Contact: Phone 1-800-SUPPORT, Email support@company.com, Live Chat during business hours""",
        
        "return_policy.txt": """RETURN POLICY: 30 days for most items, 15 days electronics
Process: Contact support -> Get RMA number -> Ship with prepaid label
Refunds: Credit card 3-5 days, PayPal 1-2 days, Store credit immediate""",
        
        "payment_methods.txt": """PAYMENT METHODS: Visa, Mastercard, Amex, Discover, PayPal, Apple Pay, Google Pay
Security: 256-bit SSL encryption, no complete card storage
International: Accepted with automatic currency conversion""",
        
        "shipping_info.txt": """SHIPPING: Standard (5-7 days) free over $50, Express $12.99 (2-3 days), Overnight $24.99
Processing: Orders before 2PM EST ship same day
Tracking: Email notifications, SMS available""",
        
        "technical_support.txt": """TECH SUPPORT: Login issues - verify credentials, clear cache
Website issues - refresh page, try different browser
App problems - restart app, check updates
Contact: tech-support@company.com or 1-800-TECH-HELP"""
    }
    
    for filename, content in docs.items():
        (data_dir / filename).write_text(content.strip(), encoding='utf-8')
        print(f"✓ Created {filename}")
    
    print(f"\n🎉 Sample documents created in {data_dir}")
    print("Run: python ingest.py")

if __name__ == "__main__":
    create_sample_documents()