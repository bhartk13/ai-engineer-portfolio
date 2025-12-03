# Plaid OAuth Redirect URI Setup

## Error: "OAuth redirect URI must be configured in the developer dashboard"

This error occurs when you try to create a Plaid Link token with OAuth, but the redirect URI hasn't been configured in your Plaid Dashboard.

## Quick Fix

### Option 1: Configure Redirect URI in Plaid Dashboard (Recommended for OAuth)

1. **Log in to Plaid Dashboard**
   - Go to https://dashboard.plaid.com/
   - Sign in with your Plaid account

2. **Navigate to API Settings**
   - Go to **Team Settings** → **API**
   - Or directly: https://dashboard.plaid.com/team/api

3. **Add Redirect URI**
   - Find the **Allowed redirect URIs** section
   - Click **Add redirect URI**
   - Enter: `http://localhost:8501/oauth/callback`
   - Click **Save**

4. **Wait for Changes to Propagate**
   - Changes may take a few minutes to take effect
   - Try creating a link token again

### Option 2: Disable OAuth Redirect (For Testing)

If you're just testing and don't need OAuth flow:

1. **Set environment variable:**
   ```bash
   export PLAID_REDIRECT_URI=""
   ```

2. **Or update config.py:**
   ```python
   PLAID_REDIRECT_URI = ""  # Empty string disables OAuth redirect
   ```

3. **Restart your application**

## Common Redirect URIs

Depending on your setup, you might need different redirect URIs:

- **Local Development**: `http://localhost:8501/oauth/callback`
- **Local with different port**: `http://localhost:8502/oauth/callback`
- **Production**: `https://yourdomain.com/oauth/callback`

## Verify Configuration

After adding the redirect URI in the dashboard:

1. Wait 2-3 minutes for changes to propagate
2. Try the command again: `@fintech show my accounts`
3. Check the debug logs for any errors

## Troubleshooting

### Still Getting the Error?

1. **Check the exact URI**: Make sure the URI in your code matches exactly what's in the dashboard (including `http://` vs `https://`, port numbers, trailing slashes)

2. **Check Environment**: Make sure you're using the correct Plaid environment (Sandbox vs Production)

3. **Wait for Propagation**: Plaid changes can take a few minutes to propagate

4. **Check API Keys**: Ensure you're using the correct API keys for the environment where you configured the redirect URI

### Testing Without OAuth

For basic testing without OAuth flow, you can:
- Set `PLAID_REDIRECT_URI=""` (empty string)
- The link token will be created without OAuth redirect
- You'll still be able to test other Plaid features

## Next Steps

Once the redirect URI is configured:
1. The OAuth flow will work properly
2. Users can authenticate via Plaid Link
3. The redirect will send them back to your callback URL
4. You can exchange the public token for an access token

## Additional Resources

- [Plaid OAuth Documentation](https://plaid.com/docs/auth/oauth/)
- [Plaid Dashboard](https://dashboard.plaid.com/)
- [Plaid API Reference](https://plaid.com/docs/api/)

