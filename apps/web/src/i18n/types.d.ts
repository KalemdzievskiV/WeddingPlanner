import type { Locale } from "@svadba/shared";
import type { Messages } from "@svadba/i18n";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
