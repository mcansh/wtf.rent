# wtf.rent

put your landlord on blast. inspired by https://twitter.com/ebey_jacob/status/1441455129312436227

## Errors

Set `SENTRY_DSN` to report process failures and failures caught around `router.fetch` to Sentry. When the variable is missing, empty, or only whitespace, the server skips `Sentry.init` and sends nothing.

Production already has `SENTRY_DSN` on the `wtf.rent` service. `.railway/railway.ts` lists that variable as `preserve()` so a later `railway config apply` keeps the sealed value. Do not commit the DSN. `.env` is gitignored. Put the variable in `.env` only when that local process should send errors to the `wtf-rent` project.

With a DSN set, Node loads `instrument.ts` before application modules and initializes `@sentry/node` with `tracesSampleRate` set to `0`. The process does not install `@sentry/profiling-node`. JSON request logs from `request-telemetry` stay on stdout and stderr.
