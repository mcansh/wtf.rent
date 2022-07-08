# base node image
FROM node:18-bullseye-slim as base

# install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

# set for base and all that inherit from it
ENV NODE_ENV=production

# install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /workdir
WORKDIR /workdir

ADD package.json package-lock.json ./
RUN npm install --production=false

# setup production node_modules
FROM base as production-deps

RUN mkdir /workdir
WORKDIR /workdir

COPY --from=deps /workdir/node_modules /workdir/node_modules
ADD package.json package-lock.json ./
RUN npm prune --production

# build the app
FROM base as build

RUN mkdir /workdir
WORKDIR /workdir

COPY --from=deps /workdir/node_modules /workdir/node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
RUN npm run build

# finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production

RUN mkdir /workdir
WORKDIR /workdir

COPY --from=production-deps /workdir/node_modules /workdir/node_modules
COPY --from=build /workdir/node_modules/.prisma /workdir/node_modules/.prisma
COPY --from=build /workdir/build /workdir/build
COPY --from=build /workdir/public /workdir/public
COPY --from=build /workdir/prisma /workdir/prisma
COPY --from=build /workdir/package.json /workdir/package.json
COPY --from=build /workdir/remix.config.js /workdir/remix.config.js
COPY start_with_migrations.sh ./start_with_migrations.sh

ENTRYPOINT [ "./start_with_migrations.sh" ]
