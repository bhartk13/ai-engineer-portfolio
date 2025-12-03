import streamlit as st, requests, os, json
API_BASE = os.getenv('API_BASE', 'http://localhost:8000')
st.set_page_config(page_title='Generic Multi-Agent - HITL', layout='wide')

st.title('Generic Multi-Agent Framework - HITL Review')

with st.expander('Orchestrate a new plan'):
    session_id = st.text_input('Session ID', value='session1')
    goal = st.text_area('Goal', value='Help me plan a 7-day learning schedule for Python.')
    if st.button('Run Planner'):
        r = requests.post(f"{API_BASE}/plan", json={'session_id': session_id, 'goal': goal})
        st.write(r.json())

st.header('Load session for review')
sid = st.text_input('Session to load', value='session1', key='sid')
if st.button('Load'):
    r = requests.get(f"{API_BASE}/session/{sid}")
    if r.status_code == 200:
        data = r.json()
        st.subheader('Session Data')
        st.json(data)
        if data.get('status') == 'pending_review':
            st.warning('Session requires human review. Edit final_output below and Save or Approve.')
        st.subheader('Edit final output (JSON)')
        final = data.get('final_output') or data.get('results') or {}
        edit = st.text_area('Final JSON', value=json.dumps(final, indent=2), height=300)
        if st.button('Save Review'):
            try:
                parsed = json.loads(edit)
            except Exception as e:
                st.error(f'Invalid JSON: {e}')
            else:
                rr = requests.post(f"{API_BASE}/review/{sid}", json={'final_output': parsed})
                st.write(rr.json())
        if st.button('Approve Session'):
            ra = requests.post(f"{API_BASE}/approve/{sid}")
            st.write(ra.json())
    else:
        st.error('Session not found')
