# Debugging Streamlit Applications

## Quick Start

### 1. Run Streamlit with Debug Output
```bash
# From the mcp-financial-assistant directory
streamlit run app/ui/chat_streamlit.py
```

### 2. Enable Debug Mode
- Use the sidebar checkbox "🐛 Debug Mode" in the UI, OR
- Set environment variable: `STREAMLIT_DEBUG=true streamlit run app/ui/chat_streamlit.py`

## Debugging Techniques

### 1. **Print Statements** (View in Terminal)
```python
print("Debug: Variable value =", variable)
print(f"Debug: User is {user_id}")
```

Streamlit prints to the terminal where you ran `streamlit run`. Check your console/terminal output.

### 2. **st.write() for Quick Debugging**
```python
st.write("Debug info:", variable)
st.write(f"Session state: {st.session_state}")
```

### 3. **st.json() for Structured Data**
```python
st.json({"key": "value", "data": some_dict})
```

### 4. **st.expander() for Collapsible Debug Info**
```python
with st.expander("🔍 Debug Info"):
    st.json(debug_data)
```

### 5. **Exception Handling with Traceback**
```python
try:
    # your code
except Exception as e:
    st.error(f"Error: {e}")
    st.code(traceback.format_exc())
```

### 6. **Session State Inspection**
```python
# In your app
st.sidebar.json(dict(st.session_state))
```

## VS Code Debugging Setup

Create `.vscode/launch.json` in your project root:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Streamlit",
            "type": "debugpy",
            "request": "launch",
            "module": "streamlit",
            "args": [
                "run",
                "app/ui/chat_streamlit.py",
                "--server.headless=true"
            ],
            "cwd": "${workspaceFolder}/mcp/mcp-financial-assistant",
            "console": "integratedTerminal",
            "justMyCode": false
        }
    ]
}
```

Then set breakpoints and press F5 to debug!

## Common Debugging Scenarios

### Debug Session State
```python
if st.session_state.debug_mode:
    st.sidebar.write("Session State:")
    st.sidebar.json({k: str(v) for k, v in st.session_state.items()})
```

### Debug API Calls
```python
if st.session_state.debug_mode:
    st.write("API Request:", request_data)
    st.write("API Response:", response_data)
```

### Debug Variable Values
```python
# Use st.write or print
st.write(f"Current user: {st.session_state.current_user}")
print(f"DEBUG: Processing command: {command}")
```

## Streamlit-Specific Tips

1. **Hot Reload**: Streamlit auto-reloads on file save. Watch the terminal for errors.

2. **Clear Cache**: Use `st.cache_data.clear()` or restart the app to clear cached functions.

3. **View Logs**: Check the terminal where you ran `streamlit run` for all print() output.

4. **Error Messages**: Streamlit shows errors in red boxes in the UI. Check both UI and terminal.

5. **Session State**: Use `st.session_state` to persist data across reruns. Debug with:
   ```python
   st.sidebar.write("Session State:", st.session_state)
   ```

## Environment Variables for Debugging

```bash
# Enable debug mode
export STREAMLIT_DEBUG=true

# Show more verbose logging
export STREAMLIT_LOGGER_LEVEL=debug

# Run with specific port
streamlit run app/ui/chat_streamlit.py --server.port 8502
```

## Testing Your App

1. **Test in Browser Console**: Open browser DevTools (F12) and check Console tab for JavaScript errors.

2. **Test API Calls**: Use `st.write()` to display API responses before processing.

3. **Test State Changes**: Add debug output when session state changes:
   ```python
   if st.session_state.debug_mode:
       st.write(f"State changed: {key} = {value}")
   ```

## Quick Debug Checklist

- [ ] Check terminal/console for print() output
- [ ] Enable debug mode in sidebar
- [ ] Check browser console (F12) for errors
- [ ] Verify session state values
- [ ] Check API responses with st.json()
- [ ] Use st.expander() for detailed debug info
- [ ] Add try/except blocks with traceback

## Example Debug Code Pattern

```python
import traceback

try:
    result = some_function()
    if st.session_state.debug_mode:
        st.write("✅ Success:", result)
except Exception as e:
    st.error(f"❌ Error: {e}")
    if st.session_state.debug_mode:
        st.code(traceback.format_exc())
```

