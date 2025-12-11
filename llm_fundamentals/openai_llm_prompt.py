from openai import OpenAI
import tiktoken

client = OpenAI(api_key="")
MODEL = "gpt-4o-mini"

encoding = tiktoken.get_encoding("cl100k_base")

def count_tokens(text:str) -> int:
    return len(encoding.encode(text))

def run_prompt(prompt: str) :
    print(f"Input prompt: {prompt}")
    input_tokens = count_tokens(prompt)
    print(f"Input token count: {input_tokens}")

    response = client.chat.completions.create(
        model = MODEL,
        messages = [{
            "role":"user",
            "content": prompt,
            "temperature": 0.2
        }]
    )
    print(response)
    output_text = response.choices[0].message.content
    print(output_text)
    output_tokens = count_tokens(output_text)
    print(f"Output token count: {output_tokens}")
    return output_text

if __name__ == "__main__":
    prompts = [
        "Explain Agentic AI in 2 sentences",
        "Explain Agentic AI to 5 yr old",
        "How to get a job as Agentic AI engineer?"
    ]

    for p in prompts:
        run_prompt(p)



