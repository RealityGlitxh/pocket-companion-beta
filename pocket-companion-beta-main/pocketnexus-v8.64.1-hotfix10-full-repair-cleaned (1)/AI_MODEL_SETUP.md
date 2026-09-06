# Pocket Coach — Real AI Setup (V8.52.1)

Pocket Coach's real model connection is installed in the Supabase `pocket-coach` Edge Function.

## Required server secret

Add this secret to the Supabase project's Edge Function environment:

- `OPENAI_API_KEY` = your OpenAI API key

Do **not** put this key in `index.html`, browser JavaScript, localStorage, GitHub Pages variables, or any downloadable frontend file.

## Optional server secret

- `OPENAI_MODEL` = model ID to override the default

Default in V8.52.1: `gpt-5.6-terra`.

If `OPENAI_API_KEY` is missing, Pocket Coach automatically stays in the grounded `grounded-rules-v1` fallback instead of failing or exposing configuration details.
