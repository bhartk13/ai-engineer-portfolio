# Sample users + accounts used to seed DB on first run
SAMPLE_USERS = {
    "user1": {
        "profile": {"name": "Alex Johnson"},
        "accounts": [
            {"id": "1001", "name": "Alex Checking", "type": "Deposit", "balance": 4520.75, "currency": "USD"},
            {"id": "2005", "name": "Alex Savings", "type": "Deposit", "balance": 18500.50, "currency": "USD"},
            {"id": "4012", "name": "Alex Visa Rewards", "type": "Credit Card", "balance": -1250.00, "currency": "USD"},
        ],
    },
    "user2": {
        "profile": {"name": "Priya Patel"},
        "accounts": [
            {"id": "3001", "name": "Priya Checking", "type": "Deposit", "balance": 2040.10, "currency": "USD"},
            {"id": "3002", "name": "Priya Brokerage", "type": "Brokerage", "balance": 77200.00, "currency": "USD"},
        ],
    },
    "user3": {
        "profile": {"name": "Kevin Smith"},
        "accounts": [
            {"id": "9001", "name": "Kevin Credit Card", "type": "Credit Card", "balance": -540.34, "currency": "USD"},
            {"id": "9002", "name": "Kevin Savings", "type": "Deposit", "balance": 980.00, "currency": "USD"},
        ],
    },
}
