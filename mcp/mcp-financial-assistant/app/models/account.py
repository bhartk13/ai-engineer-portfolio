from typing import Dict, Any

class Account:
    def __init__(self, acc_id: str, user_id: str, name: str, acc_type: str, balance: float, currency: str = "USD"):
        self.id = acc_id
        self.user_id = user_id
        self.name = name
        self.type = acc_type
        self.balance = balance
        self.currency = currency

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "type": self.type,
            "balance": self.balance,
            "currency": self.currency,
        }
