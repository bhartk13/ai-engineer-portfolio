"""Migrate database to add Plaid columns"""
import sqlite3

conn = sqlite3.connect('data/mcp_fin_accounts.db')
cur = conn.cursor()

print("Migrating database...")
print("-" * 60)

# Check if columns exist
cur.execute("PRAGMA table_info(accounts)")
columns = [col[1] for col in cur.fetchall()]

if 'plaid_account_id' not in columns:
    print("Adding plaid_account_id column...")
    cur.execute("ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT")
    print("✅ Added plaid_account_id")
else:
    print("✓ plaid_account_id already exists")

if 'plaid_item_id' not in columns:
    print("Adding plaid_item_id column...")
    cur.execute("ALTER TABLE accounts ADD COLUMN plaid_item_id TEXT")
    print("✅ Added plaid_item_id")
else:
    print("✓ plaid_item_id already exists")

conn.commit()
conn.close()

print("-" * 60)
print("✅ Migration complete!")
