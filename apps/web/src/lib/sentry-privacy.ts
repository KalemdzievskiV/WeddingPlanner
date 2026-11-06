/**
 * Sentry collects user info, cookies, headers and request bodies by default. Turn all of it off:
 * request bodies hold guest names and emails (decision 41). Only the error and its stack trace are sent.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};
