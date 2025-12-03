from copy import deepcopy
from app.database.seeds import SAMPLE_USERS

# Simple in-memory DB; seed a deep copy so runtime edits don't alter seeds
MEMORY_DB = {"users": deepcopy(SAMPLE_USERS)}
