FROM node:24-alpine AS builder

WORKDIR /var/build

COPY . .

RUN apk add --no-cache ca-certificates \
    && npm install -g pnpm \
    && pnpm install --frozen-lockfile \
    && pnpm build


FROM node:24-alpine AS runner

WORKDIR /var/app

ARG UID=991
ARG GID=991

RUN apk add --no-cache ca-certificates tini \
    && addgroup -g "${GID}" app \
    && adduser -u "${UID}" -G app -D app

COPY --from=builder --chown=app:app /var/build/public ./public
COPY --from=builder --chown=app:app /var/build/.next/standalone ./
COPY --from=builder --chown=app:app /var/build/.next/static ./.next/static

USER app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
