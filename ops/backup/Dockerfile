# Railway cron service: nightly pg_dump to a private R2 bucket. pg_dump must be at least the server's major version.
FROM postgres:17-alpine
RUN apk add --no-cache aws-cli
COPY ops/backup/backup.sh /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
