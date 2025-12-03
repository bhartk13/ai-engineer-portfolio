from typing import Dict, Any

class User:
    def __init__(self, user_id: str, profile: Dict[str, Any]):
        self.user_id = user_id
        self.profile = profile

    def display_name(self) -> str:
        return self.profile.get("name", self.user_id)
