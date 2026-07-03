# Security checklist

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] User input sanitized before shell/SQL/file paths
- [ ] No `eval` / `exec` on untrusted strings
- [ ] HTTP calls use timeouts
- [ ] Secrets read via `os.getenv`, not committed placeholders
- [ ] File paths constrained to expected directories when handling user input
