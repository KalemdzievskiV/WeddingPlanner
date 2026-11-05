import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, uploaded files, Next internals and files with an extension.
  matcher: "/((?!api|uploads|_next|_vercel|.*\\..*).*)",
};
