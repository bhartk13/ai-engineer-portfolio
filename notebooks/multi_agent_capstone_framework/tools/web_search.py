# Mock web search tool (replace with real search + SERP API)
def web_search(query: str, max_results: int=5):
    return [{'title': f'Result for {query} #{i+1}', 'snippet': f'Snippet of result {i+1}'} for i in range(max_results)]
