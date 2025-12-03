# MCP Financial Assistant

A Model Context Protocol (MCP) server for managing financial accounts with Plaid integration. This project demonstrates how to build an AI-powered financial assistant that can connect to banks via Plaid and manage account information.

## Features

- 💬 Natural language interface for financial commands
- 🏦 Plaid integration for real-time bank account syncing
- 🔐 Secure OAuth authentication flow
- 💾 SQLite database for persistent storage
- 🎨 Streamlit web UI and console interface
- 🧪 Sandbox environment for testing

## Architecture

```
app/
├── mcp/              # MCP server implementation
│   ├── server.py     # Command handlers
│   ├── interpreter.py # NL to structured command
│   └── schema.py     # Command schemas
├── services/         # Business logic
│   ├── account_service.py
│   └── plaid_service.py
├── database/         # Data persistence
│   ├── sqlite_manager.py
│   └── memory_manager.py
├── ui/              # User interfaces
│   ├── chat_streamlit.py
│   └── console.py
└── models/          # Data models
```

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd mcp-financial-assistant

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file or set environment variables:

```bash
# Plaid Configuration (Sandbox)
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=http://localhost:8501/oauth/callback

# OpenAI (for NL interpretation)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Database
STORAGE_MODE=sqlite
SQLITE_DB_PATH=data/mcp_fin_accounts.db
```

### 3. Database Setup

```bash
# Run migration to add Plaid columns
python migrate_db.py
```

### 4. Create Test Plaid Connection

```bash
# Create a sandbox connection with test bank data
python create_sandbox_connection.py user1
```

This will:
- Create a Plaid Link token
- Generate a sandbox public token
- Exchange it for an access token
- Store the connection in your database

### 5. Run the Application

**Option A: Streamlit Web UI (Recommended)**
```bash
streamlit run app/ui/chat_streamlit.py --server.port 8501
```
Then open http://localhost:8501

**Option B: Console Interface**
```bash
python app/main.py
```

## Usage

### Natural Language Commands

The assistant understands natural language commands:

```
@fintech show my accounts
@fintech list accounts
@fintech add account Vacation;Deposit;1200
@fintech sync accounts
```

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `show my accounts` | Display all accounts with Plaid sync | `@fintech show my accounts` |
| `list accounts` | List accounts without syncing | `@fintech list accounts` |
| `add account` | Create a new account | `@fintech add account Savings;Deposit;5000` |
| `sync accounts` | Manually sync from Plaid | `@fintech sync accounts` |

### User Management

```bash
# Switch users (console)
@login user1
@user set user2

# Available test users: user1, user2, user3
```

## Plaid Integration

### Sandbox Environment

The project is configured for Plaid's Sandbox environment, which provides:
- Test bank institutions (First Platypus Bank, Chase, etc.)
- Fake account data
- No real bank connections
- Free unlimited API calls

### Test Institutions

Common sandbox institution IDs:
- `ins_109508` - Chase
- `ins_109509` - Bank of America
- `ins_109510` - Wells Fargo
- `ins_3` - First Platypus Bank (default)

### Creating Additional Connections

```bash
# Create connection for different user
python create_sandbox_connection.py user2

# Use different test institution
python create_sandbox_connection.py user1 ins_109509
```

### OAuth Flow

In Sandbox mode, the OAuth flow is simulated:
1. Link token is created
2. Sandbox public token is generated programmatically
3. Token is exchanged for access token
4. Accounts are synced automatically

For production OAuth setup, see [PLAID_OAUTH_SETUP.md](PLAID_OAUTH_SETUP.md)

## Development

### Project Structure

- **MCP Server** (`app/mcp/`): Handles structured commands
- **Services** (`app/services/`): Business logic and external APIs
- **Database** (`app/database/`): Data persistence layer
- **UI** (`app/ui/`): User interfaces (Streamlit + Console)
- **Models** (`app/models/`): Data models and schemas

### Running Tests

```bash
pytest tests/
```

### Debug Mode

Enable debug mode in Streamlit:
1. Check "🐛 Debug Mode" in sidebar
2. View structured commands and responses
3. See debug logs in real-time

## Troubleshooting

### "No Plaid connection found for user"

**Solution:**
```bash
python migrate_db.py
python create_sandbox_connection.py user1
```

### "Plaid not configured"

**Solution:** Check your `.env` file has valid Plaid credentials:
```bash
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
```

### Port 8501 already in use

**Solution:**
```bash
# Kill existing process
taskkill /F /PID <pid>

# Or use different port
streamlit run app/ui/chat_streamlit.py --server.port 8502
```

### Database schema issues

**Solution:** Reset database (backup first!):
```bash
cp data/mcp_fin_accounts.db data/mcp_fin_accounts.db.backup
rm data/mcp_fin_accounts.db
python app/main.py  # Recreates with proper schema
python migrate_db.py
python create_sandbox_connection.py user1
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PLAID_CLIENT_ID` | Plaid client ID | - | Yes |
| `PLAID_SECRET` | Plaid secret key | - | Yes |
| `PLAID_ENV` | Plaid environment | `sandbox` | Yes |
| `PLAID_REDIRECT_URI` | OAuth redirect URI | `http://localhost:8501/oauth/callback` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `OPENAI_MODEL` | OpenAI model | `gpt-4o-mini` | No |
| `STORAGE_MODE` | Storage type | `sqlite` | No |
| `SQLITE_DB_PATH` | Database path | `data/mcp_fin_accounts.db` | No |

## Plaid Environments

### Sandbox (Current)
- **Purpose:** Testing with fake data
- **API Keys:** Sandbox keys
- **Bank Connections:** Fake test banks
- **Cost:** Free
- **OAuth:** Simulated

### Development
- **Purpose:** Testing with real banks (limited)
- **API Keys:** Production keys
- **Bank Connections:** Real banks (up to 100 items)
- **Cost:** Free
- **OAuth:** Real bank authentication

### Production
- **Purpose:** Live application
- **API Keys:** Production keys
- **Bank Connections:** Real banks (unlimited)
- **Cost:** Pay per API call
- **OAuth:** Real bank authentication

To switch environments, update `PLAID_ENV` and use appropriate API keys.

## Security Notes

⚠️ **Important:**
- Never commit `.env` files or API keys to version control
- Use environment variables for sensitive data
- Rotate API keys regularly
- In production, use HTTPS for OAuth redirects
- Implement proper authentication and authorization

## Resources

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid Sandbox Guide](https://plaid.com/docs/sandbox/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Streamlit Documentation](https://docs.streamlit.io/)

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Support

For issues and questions:
- Check [PLAID_SANDBOX_QUICKSTART.md](PLAID_SANDBOX_QUICKSTART.md) for quick setup
- See [PLAID_OAUTH_SETUP.md](PLAID_OAUTH_SETUP.md) for OAuth configuration
- Review [DEBUG_STREAMLIT.md](DEBUG_STREAMLIT.md) for debugging tips
