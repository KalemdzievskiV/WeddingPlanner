# Railway cron service: calls the app's nightly job route (archive, data erasure, account deletion).
FROM alpine:3.22
RUN apk add --no-cache curl
ENTRYPOINT ["sh", "-c", ": \"${APP_URL:?APP_URL is required}\" \"${CRON_SECRET:?CRON_SECRET is required}\" && curl -fsS --max-time 290 -X POST -H \"Authorization: Bearer ${CRON_SECRET}\" \"${APP_URL%/}/api/cron/nightly\""]
