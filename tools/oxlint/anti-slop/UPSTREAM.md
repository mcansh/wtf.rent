# Anti-slop provenance

This directory is vendored from [mcansh/oxc-config at `497c8ef`](https://github.com/mcansh/oxc-config/tree/497c8efe1596235be7f55ecd55962b00f44f80ac/src/plugins/anti-slop), which forks [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop). Existing rule files match that revision. Its `UPSTREAM.md` records the upstream revisions and the adopted rule fixes.

This project then registered and enabled the pending generic rules from [dmmulroy/anti-slop `13909c9`](https://github.com/dmmulroy/anti-slop/tree/13909c9e07590f5a85d93c62712259fe14a883f7): `no-array-filter-map` and `no-reduce-accumulator-copy`, plus their `array-method.ts` helper. Those helpers follow unreassigned local `let` initializers because `remix-style/prefer-let-locals` forbids function-local `const`. `require-readable-spacing` remains unadopted because it needs the ESLint Stylistic vendor tree. The Effect rule group remains unadopted.

The previous copy matched oxc-config `028356e`, the original mcan.sh snapshot, apart from formatting.

To update, compare this directory against the newer oxc-config source and reconcile local rule registrations before copying.
