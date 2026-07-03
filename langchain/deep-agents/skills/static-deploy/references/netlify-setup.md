# Netlify setup

Required env vars (in project `.env`):

```env
NETLIFY_AUTH_TOKEN=your_token
NETLIFY_SITE_ID=optional_existing_site_id
DEPLOY_PLATFORM=netlify
```

If deploy builds locally but does not go live:

1. Confirm `NETLIFY_AUTH_TOKEN` is set.
2. Check `/workspace/deploy_report_<slug>.md` for error details.
3. Site bundle still available at `/workspace/sites/<slug>/index.html`.

Get a token: https://app.netlify.com/user/applications#personal-access-tokens
