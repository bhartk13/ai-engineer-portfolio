# Plaid OAuth Integration Setup

This guide explains how to set up and use Plaid OAuth for connecting financial institutions like Chase, Bank of America, etc.

## Prerequisites

1. **Plaid Account**: Sign up at https://plaid.com
2. **API Keys**: Get your `client_id` and `secret` from Plaid Dashboard
3. **Environment Setup**: Configure environment variables

## Environment Variables

Set these environment variables before running the application:

```bash
# Required for Plaid
export PLAID_CLIENT_ID="your_client_id_here"
export PLAID_SECRET="your_secret_here"
export PLAID_ENV="sandbox"  # Options: sandbox, development, production
export PLAID_REDIRECT_URI="http://localhost:8501/oauth/callback"
```

Or create a `.env` file in the project root:
```
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=http://localhost:8501/oauth/callback
```

## Installation

Install the Plaid Python SDK:

```bash
pip install -r requirements.txt
```

## Usage

### 1. Connect a Bank Account

In the chat UI, use natural language commands:

```
@fintech connect my chase bank account
@fintech connect to bank of america
@fintech link plaid
```

This will:
- Create a Plaid Link token
- Display instructions for connecting
- Store the connection when OAuth completes

### 2. Sync Accounts

After connecting, sync accounts from Plaid:

```
@fintech sync my plaid accounts
@fintech sync accounts from bank
```

Or use the sidebar button: **🔄 Sync Accounts**

### 3. List Connections

View all connected institutions:

```
@fintech list my bank connections
@fintech show connected institutions
```

### 4. View Accounts

After syncing, view accounts normally:

```
@fintech list my accounts
```

## OAuth Flow

The OAuth flow works as follows:

1. **User initiates connection**: `@fintech connect bank`
2. **System creates Link token**: Plaid Link token is generated
3. **User authenticates**: User logs in via Plaid Link (in production, this would be embedded)
4. **Public token received**: Plaid returns a public token
5. **Token exchange**: System exchanges public token for access token
6. **Connection stored**: Access token and institution info stored in database
7. **Accounts synced**: Accounts are fetched from Plaid and stored locally

## Database Schema

The following tables are created automatically:

### `plaid_connections`
Stores OAuth connections:
- `id`: Primary key (item_id)
- `user_id`: User who owns the connection
- `item_id`: Plaid item ID
- `access_token`: Encrypted access token
- `institution_id`: Plaid institution ID
- `institution_name`: Bank name
- `created_at`: Connection timestamp
- `last_synced_at`: Last sync timestamp

### `plaid_link_tokens`
Stores temporary link tokens:
- `link_token`: The token
- `user_id`: User who requested it
- `expires_at`: Expiration timestamp

### `accounts` (updated)
Added fields:
- `plaid_account_id`: Plaid account ID
- `plaid_item_id`: Associated Plaid item

## Production Considerations

### 1. Plaid Link Component

In production, you need to embed the Plaid Link component. This requires:

- Frontend JavaScript integration
- Handling the `onSuccess` callback
- Passing the `public_token` back to your backend

Example (not included, requires frontend):
```javascript
const handler = Plaid.create({
  token: linkToken,
  onSuccess: (public_token, metadata) => {
    // Send public_token to backend
    fetch('/api/plaid/exchange', {
      method: 'POST',
      body: JSON.stringify({ public_token })
    });
  }
});
```

### 2. Security

- **Never expose access tokens** in frontend
- **Use HTTPS** in production
- **Encrypt access tokens** at rest (consider using encryption)
- **Implement token refresh** (Plaid tokens can expire)

### 3. Error Handling

The service includes error handling for:
- Missing Plaid configuration
- Invalid tokens
- API failures
- Network errors

All errors fall back gracefully and show user-friendly messages.

### 4. Sandbox Testing

For testing, use Plaid's sandbox environment:
- Test credentials: `user_good` / `pass_good`
- Test institutions: Search for "First Platypus Bank" or "Chase"
- No real money or accounts involved

## API Actions

The MCP server supports these Plaid actions:

- `PLAID_CREATE_LINK_TOKEN`: Start OAuth flow
- `PLAID_EXCHANGE_TOKEN`: Complete OAuth (requires public_token)
- `PLAID_LIST_CONNECTIONS`: List user's connections
- `PLAID_SYNC_ACCOUNTS`: Sync accounts from Plaid

## Troubleshooting

### "Plaid not configured"
- Check that `PLAID_CLIENT_ID` and `PLAID_SECRET` are set
- Verify environment variables are loaded

### "No Plaid connection found"
- User hasn't connected any banks yet
- Use `@fintech connect bank` first

### "Failed to sync accounts"
- Check Plaid API status
- Verify access token is valid
- Check network connectivity

### Link token expired
- Link tokens expire in 4 hours
- Create a new one with `@fintech connect bank`

## Next Steps

1. Set up Plaid account and get API keys
2. Configure environment variables
3. Test with sandbox environment
4. Integrate Plaid Link component in UI (for production)
5. Set up token refresh mechanism
6. Implement account balance updates

