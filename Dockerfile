FROM alpine:edge AS builder

WORKDIR /var/build

COPY . .

ENV DATABASE_URL="mongodb://localhost:27017/unused"
ENV AWS_ACCESS_KEY_ID="placeholder"
ENV AWS_SECRET_ACCESS_KEY="placeholder"
ENV AWS_S3_REGION="us-east-1"
ENV AWS_S3_ENDPOINT="http://localhost:9000"
ENV AWS_S3_BUCKET="placeholder"
RUN apk add --no-cache nodejs pnpm ca-certificates \
    && pnpm install --frozen-lockfile \
    && pnpm build


FROM alpine:edge AS runner

WORKDIR /var/app

ARG UID=991
ARG GID=991

RUN apk add --no-cache ca-certificates nodejs tini \
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
