def format_currency(amount: float, currency: str = "USD") -> str:
    # Simple formatting, e.g. "USD 1,234.50" — adjust for locale if needed
    return f"{currency} {amount:,.2f}"
