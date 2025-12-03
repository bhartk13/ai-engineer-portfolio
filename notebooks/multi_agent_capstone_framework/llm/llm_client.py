import os, json, re
from dotenv import load_dotenv
load_dotenv()

GENAI_AVAILABLE = False
client = None
try:
    from google import genai
    if os.getenv('GEMINI_API_KEY'):
        client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
        GENAI_AVAILABLE = True
except Exception:
    GENAI_AVAILABLE = False
    client = None

def clean_fenced(text: str) -> str:
    if not text:
        return text
    s = text.strip()
    s = re.sub(r"^```(?:json)?", "", s, flags=re.IGNORECASE)
    s = re.sub(r"```$", "", s).strip()
    return s

def call_llm(prompt: str, model: str='gemini-2.0-flash'):
    # returns raw text; in absence of LLM returns mocked structured response for local testing
    if GENAI_AVAILABLE:
        try:
            print("Calling LLM with prompt:", prompt)
            resp = client.models.generate_content(model=model, contents=[{"role":"user","parts":[{"text":prompt}]}])
            text = None
            try:
                text = resp.candidates[0].content.parts[0].text
            except Exception:
                text = getattr(resp, 'text', None)
            text = clean_fenced(text)
            return text
        except Exception as e:
            print('LLM call failed:', e)
            return None
    # MOCK responses:
    if 'plan' in prompt.lower():
        return json.dumps({"steps": [{"id":"s1","role":"research","input":{"query":"example"}},{"id":"s2","role":"analyze","input":{"data":"from s1"}},{"id":"s3","role":"execute","input":{"action":"noop"}}]})
    if 'research' in prompt.lower():
        return json.dumps({"data":"sample facts"})
    if 'analyze' in prompt.lower():
        return json.dumps({"insights":"sample analysis"})
    return json.dumps({"text":"mock response"})
