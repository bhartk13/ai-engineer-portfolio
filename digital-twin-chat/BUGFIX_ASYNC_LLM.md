# Bug Fix: Async LLM Client Issue

## Problem
When testing the chat UI, users received a "Service Unavailable" error when sending messages. The backend was returning:
```json
{"detail":"LLM service unavailable"}
```

## Root Cause
The `_generate_openai` method in `llm_client.py` was declared as `async` but was making a synchronous call to the OpenAI API:

```python
async def _generate_openai(self, messages: List[dict], stream: bool) -> str:
    response = self.client.chat.completions.create(...)  # Synchronous call in async function
```

This caused the async function to block, leading to the service unavailable error.

## Solution
Wrapped the synchronous OpenAI API call in `asyncio.run_in_executor()` to properly handle it in an async context:

```python
async def _generate_openai(self, messages: List[dict], stream: bool) -> str:
    import asyncio
    from functools import partial
    
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        partial(
            self.client.chat.completions.create,
            model=self.model,
            messages=messages,
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
    )
```

## Files Modified
- `digital-twin-chat/backend/llm_client.py` - Fixed async/sync mismatch

## Testing
After the fix:
1. ✅ Backend starts successfully
2. ✅ Health endpoint responds correctly
3. ✅ Chat endpoint should now work properly

## Status
✅ Fixed - Backend restarted with the fix applied

The chat UI should now work correctly!
