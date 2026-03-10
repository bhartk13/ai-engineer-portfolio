"""
Token and Word Counter
Counts both words and tokens from the GitHub wiki page
"""

import sys
import re

# Check for required packages
try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not found.")
    print("Install it with: pip install requests")
    sys.exit(1)

try:
    import tiktoken
except ImportError:
    print("ERROR: 'tiktoken' package not found.")
    print("Install it with: pip install tiktoken")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: 'beautifulsoup4' package not found.")
    print("Install it with: pip install beautifulsoup4")
    sys.exit(1)


def clean_html_to_text(html_content):
    """Extract clean text from HTML content, focusing on wiki article."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find the main wiki content - GitHub uses specific div for wiki content
    wiki_body = soup.find('div', {'class': 'markdown-body'})
    
    if not wiki_body:
        # Fallback to body if wiki div not found
        wiki_body = soup.find('body')
    
    if wiki_body:
        # Remove script, style, nav, and other non-content elements
        for element in wiki_body(["script", "style", "nav", "header", "footer", "aside"]):
            element.decompose()
        
        # Get text
        text = wiki_body.get_text()
    else:
        text = soup.get_text()
    
    # Break into lines and remove leading/trailing space
    lines = (line.strip() for line in text.splitlines())
    
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text


def count_words(text):
    """Count words in text."""
    # Split by whitespace and count non-empty strings
    words = text.split()
    return len(words)


def count_tokens(text, encoding_name="cl100k_base"):
    """Count tokens using tiktoken."""
    encoding = tiktoken.get_encoding(encoding_name)
    tokens = encoding.encode(text)
    return len(tokens)


def main():
    # URL of the GitHub wiki page
    url = "https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide"
    
    print("Fetching Spring Boot 4.0 Migration Guide...")
    print(f"URL: {url}\n")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Python Token Counter)"
    }
    
    try:
        # Fetch the content
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"ERROR: Failed to fetch document (HTTP {response.status_code})")
            print(f"Response: {response.text[:200]}")
            sys.exit(1)
        
        # Extract text from HTML
        text = clean_html_to_text(response.text)
        
        # Additional cleanup for wiki content
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = text.strip()
        
        # Display statistics
        print("=" * 60)
        print("DOCUMENT STATISTICS")
        print("=" * 60)
        
        # Character count
        char_count = len(text)
        print(f"Total characters: {char_count:,}")
        
        # Word count
        word_count = count_words(text)
        print(f"Total words:      {word_count:,}")
        
        # Token count with different encodings
        print("\nTOKEN COUNTS (by encoding):")
        print("-" * 60)
        
        # cl100k_base (GPT-4, GPT-3.5-turbo)
        tokens_cl100k = count_tokens(text, "cl100k_base")
        print(f"cl100k_base (GPT-4, GPT-3.5-turbo):  {tokens_cl100k:,} tokens")
        
        # o200k_base (GPT-4o)
        tokens_o200k = count_tokens(text, "o200k_base")
        print(f"o200k_base (GPT-4o):                 {tokens_o200k:,} tokens")
        
        # p50k_base (Codex, text-davinci-002)
        tokens_p50k = count_tokens(text, "p50k_base")
        print(f"p50k_base (Codex):                   {tokens_p50k:,} tokens")
        
        # Additional metrics
        print("\n" + "=" * 60)
        print("ADDITIONAL METRICS")
        print("=" * 60)
        print(f"Lines:                {len(text.splitlines()):,}")
        print(f"Avg characters/word:  {char_count/word_count:.2f}")
        print(f"Avg words/token:      {word_count/tokens_cl100k:.2f} (cl100k_base)")
        
        # Preview
        print("\n" + "=" * 60)
        print("PREVIEW (first 500 characters)")
        print("=" * 60)
        print(text[:500])
        if len(text) > 500:
            print("...")
        
        return {
            'characters': char_count,
            'words': word_count,
            'tokens_cl100k': tokens_cl100k,
            'tokens_o200k': tokens_o200k,
            'tokens_p50k': tokens_p50k
        }
        
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Network error occurred: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()