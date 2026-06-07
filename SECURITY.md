# Security Policy

This is an early educational prototype. It has no backend, no authentication, no database, and no API keys.

## Supported Version

Only the current `main` branch is maintained.

## Reporting A Security Issue

If you find a security issue, open a GitHub issue with:

- affected file,
- reproduction steps,
- expected behavior,
- actual behavior,
- whether the issue requires a crafted JSON file, browser action, or local file access.

Do not include real brokerage data, API keys, account identifiers, or private financial information in reports.

## Current Threat Model

The main relevant risks are:

- malicious strategy JSON loaded into the browser,
- unsafe rendering of user-provided strings,
- misleading financial outputs due to incorrect assumptions,
- accidental inclusion of secrets in future integrations.

The current prototype intentionally avoids:

- backend services,
- remote data fetching,
- API keys,
- broker integration,
- order execution.

