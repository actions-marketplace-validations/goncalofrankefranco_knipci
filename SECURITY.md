# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Use GitHub's private vulnerability reporting for this repository when available. If it is unavailable, contact the repository owner through a private GitHub channel and include only the minimum reproduction details needed for triage.

Never include credentials, access tokens, customer source code, or personal data in an issue, Pull Request, log, or report.

## Security boundaries

KnipCI executes project-defined install, build, and test commands on the caller's runner. Those commands can execute arbitrary project scripts. Users should:

- run auto-fix only from trusted workflows;
- avoid `pull_request_target` with untrusted checkout code;
- use least-privilege GitHub permissions;
- pin third-party Actions to full commit SHAs;
- review generated diffs before merging;
- keep secrets out of auto-fix jobs unless required.

KnipCI does not upload source code to a hosted KnipCI service.
