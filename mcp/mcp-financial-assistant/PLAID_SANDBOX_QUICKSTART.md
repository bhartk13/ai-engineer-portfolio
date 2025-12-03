# Plaid Sandbox Quick Start

## Issue Fixed

The "No Plaid connection found for user" error occurred because:
1. The database was missing Plaid-related columns (`plaid_account_id`, `plaid_item_id`)
2. No Plaid connections existed in the database
3. The Plaid API returned enum types that weren't being handled correctly

## What Was Fixed

1. **Database Migration**: Added missing columns to the `accounts` table
2. **Enum Handling**: Fixed the account type mapping to handle Plaid's enum types
3. **Sandbox Connection**: Created a helper script to easily set up test connections

## Quick Start

### 1. Set Up a Test Connection (Sandbox)

Run this command to create a test Plaid connection:

```bash
python create_sandbox_connection.py user1
```

This will:
- Create a sandbox public token using Plaid's test bank
- Exchange it for an access token
- Store the connection in your database

### 2. Test the Integration

Now you can use the financial assistant:

```bash
python app/main.py
```

Then try:
```
@fintech show my accounts
```

You should see accounts synced from Plaid's sandbox environment!

## Available Test Institutions

You can specify different test banks:

```bash
# Chase (default)
python create_sandbox_connection.py user1 ins_109508

# Bank of America
python create_sandbox_connection.py user1 ins_109509

# Wells Fargo
python create_sandbox_connection.py user1 ins_109510

# First Platypus Bank (Plaid's test bank)
python create_sandbox_connection.py user1 ins_3
```

## How It Works

1. **Link Token Creation**: Creates a secure token for Plaid Link
2. **OAuth Flow**: In production, users authenticate via Plaid Link UI
3. **Token Exchange**: Public token is exchanged for an access token
4. **Account Sync**: Accounts are fetched from Plaid and stored locally

## Sandbox vs Production

**Sandbox Mode** (current):
- Uses test credentials
- No real bank connections
- Free to use
- Can create connections programmatically

**Production Mode**:
- Requires real bank authentication
- Users complete OAuth in Plaid Link UI
- Costs per API call
- Must configure redirect URI in Plaid Dashboard

## Troubleshooting

### "No Plaid connection found"
Run the migration and create a connection:
```bash
python migrate_db.py
python create_sandbox_connection.py user1
```

### "Plaid not configured"
Check your `.env` file has:
```
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
```

### Database Issues
If you need to reset:
```bash
# Backup first!
cp data/mcp_fin_accounts.db data/mcp_fin_accounts.db.backup

# Then delete and restart
rm data/mcp_fin_accounts.db
python app/main.py  # Will recreate with proper schema
python migrate_db.py  # Add Plaid columns
python create_sandbox_connection.py user1  # Create connection
```

## Next Steps

For production use:
1. Set up OAuth redirect URI in Plaid Dashboard
2. Implement Plaid Link UI component
3. Handle OAuth callbacks
4. Switch to production environment

See `PLAID_OAUTH_SETUP.md` for detailed OAuth setup instructions.
