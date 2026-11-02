# Railway configuration

This project defines its Railway infrastructure in code.

```txt
.railway/railway.ts
```

Use this file to describe the Railway project you want: services, databases, buckets, custom domains, replicas, groups, and environment variables.

## Common commands

Create the configuration files:

```bash
railway config init
```

Import an existing Railway project into code:

```bash
railway config pull
```

Preview what Railway would change:

```bash
railway config plan
```

Apply the planned changes:

```bash
railway config apply
```

## Notes

- The app requires `REDIS_URL` and waits for Redis before accepting HTTP requests. Initial
  connection attempts retry for up to 10 seconds, then the process exits with code 1 so an
  On Failure restart policy can restart it. Normal client reconnection continues after startup.
  Signal-driven shutdown allows Redis up to 5 seconds to drain before forcing a nonzero exit.
- Keep Redis data on a persistent volume. Local Compose enables AOF; Railway's Redis service
  configuration is separate. The current production and PR preview services use a `/data`
  volume and RDB snapshots (`--save 60 1`). Those snapshots can lose recent writes on a crash;
  enable AOF in the Railway Redis service as well if that stronger durability is required.
- Deploying from cookie-backed sessions to Redis requires users to sign in again. Keep
  `SESSION_SECRETS` stable, and provision Redis plus `REDIS_URL` before deploying the app.
- The TTL applies when session records are written. If reusing Redis from an earlier PR preview,
  inspect this app's `session:` keys for missing expiry (`TTL = -1`) and apply a one-time expiry
  or invalidate those sessions before relying on the 30-day retention guarantee. Do not clear
  unrelated Redis data.

- `railway config plan` is safe and does not change Railway.
- `railway config apply` previews changes and asks before applying unless you pass `--yes`.
- Destructive changes in non-interactive or agent sessions require `railway config apply --confirm-destructive` after reviewing the plan.
- Services already managed by `railway.json` must be migrated before `.railway/railway.ts` can manage them.
- Use `replicas` for scaling; advanced placement can still specify region names.
- Use `group("Name", [resources])` to keep large projects organized on the Railway canvas.
- Secrets imported from Railway are rendered as `preserve()` so existing values are retained without writing secret values to source. Use `railway config pull --omit-preserved-variables` for a smaller import.
