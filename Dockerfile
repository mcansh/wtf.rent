FROM ghcr.io/nubjs/nub:0.7.5

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN nub ci --registry=https://registry.npmjs.org/

COPY --chown=node:node . .
RUN nub run build

CMD ["nub", "run", "start"]
