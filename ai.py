import os
from typing import Generator
import ast  # for converting embeddings saved as strings back to arrays
import openai  # for calling the OpenAI API
import pandas as pd  # for storing text and embeddings data
import tiktoken  # for counting tokens
from scipy import spatial  # for calculating vector similarities for search
from flask import session
from pdfminer.high_level import extract_text

OPEN_API_KEY = os.environ.get("OPEN_API_KEY")
openai.api_key = OPEN_API_KEY

# models
EMBEDDING_MODEL = "text-embedding-ada-002"
GPT_MODEL = "gpt-3.5-turbo-16k-0613"
MAX_TOKENS_CONTEXT = 16385

# download pre-chunked text and pre-computed embeddings
embeddings_path = os.environ.get("EMBEDDINGS_CSV_URL")
df = pd.read_csv(embeddings_path)

# convert embeddings from CSV str type back to list type
df['embedding'] = df['embedding'].apply(ast.literal_eval)

# search function
def strings_ranked_by_relatedness(
    query: str,
    df: pd.DataFrame,
    relatedness_fn=lambda x, y: 1 - spatial.distance.cosine(x, y),
    top_n: int = 100
) -> tuple[list[str], list[float]]:
    """Returns a list of strings and relatednesses, sorted from most related to least."""
    query_embedding_response = openai.Embedding.create(
        model=EMBEDDING_MODEL,
        input=query,
    )
    query_embedding = query_embedding_response["data"][0]["embedding"]
    strings_and_relatednesses = [
        (row["text"], relatedness_fn(query_embedding, row["embedding"]))
        for i, row in df.iterrows()
    ]
    strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
    strings, relatednesses = zip(*strings_and_relatednesses)
    return strings[:top_n], relatednesses[:top_n]

def num_tokens(text: str, model: str = GPT_MODEL) -> int:
    """Return the number of tokens in a string."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))


def query_message(
    query: str,
    df: pd.DataFrame,
    model: str,
    token_budget: int
) -> str:
    """Return a message for GPT, with relevant source texts pulled from a dataframe."""
    strings, relatednesses = strings_ranked_by_relatedness(query, df)
    introduction = 'The articles below have context you can use about Exporting Goods to answer the subsequent question. Please provide sources. Write wikipedia sources format with url https://en.wikipedia.org/wiki/. If the answer cannot be found, just use your own knowledge instead.'
    question = f"\n\nQuestion: {query}"
    message = introduction
    for string in strings:
        next_article = f'\n\nWikipedia article section:\n"""\n{string}\n"""'
        if (
            num_tokens(message + next_article + question, model=model)
            > token_budget
        ):
            break
        else:
            message += next_article
    return message + question

def query_context(query: str, filepath: str) -> str:
    introduction = 'The following pdf file below contains context you can use about Exporting Goods to answer the subsequent question. If answering using the PDF file end the reply with source: <file name.pdf>. If the answer cannot be found, just use your own knowledge instead.'

    message = introduction

    pdf_file_content = extract_text(session.get('injected_context_filename'))
    
    print("filepath", filepath)
    # print("pdf_file_content", pdf_file_content)

    next_article = f'\n\PDF file name: {filepath}\n"""\n{pdf_file_content}\n"""'
    message += next_article

    question = f"\n\nQuestion: {query}"
    return message + question

def toucan_ask(
    query: str,
    locale: str = None,
    df: pd.DataFrame = df,
    model: str = GPT_MODEL,
    token_budget: int = 4096,
):
    if (session.get('injected_context_filename')):
        print("Using injected context and model gpt-3.5-turbo-16k-0613", session.get('injected_context_filename'))
        message = query_context(query, session.get('injected_context_filename'))
        print("num_tokens(message)", num_tokens(message))
    else:
        """Answers a query using GPT and a dataframe of relevant texts and embeddings."""
        message = query_message(query, df, model=model, token_budget=token_budget)

    if (locale != None):
        messages = [
            {"role": "user", "content": message},
            {"role": "user", "content": "Make sure all of the reply is in this language locale: " + locale},
        ]
    else:
        messages = [
            {"role": "user", "content": message},
        ]
    return ask(messages)


def ask(
    messages: list[object],
    locale: str = None,
    model: str = GPT_MODEL,
) -> Generator[str, None, None]:
    try:
        for chunk in openai.ChatCompletion.create(
            model=model,
            messages=messages,
            temperature=0,
            stream=True
        ):
            content = chunk["choices"][0].get("delta", {}).get("content")
            if content is not None:
                    yield content

    except Exception as e:
        print(e)
        return str(e)

def ask_wait(
    messages: list[object],
    model: str = GPT_MODEL,
) -> str:
    """Answers a query using GPT"""
    response = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=0
    )
    response_message = response["choices"][0]["message"]["content"]
    return response_message
