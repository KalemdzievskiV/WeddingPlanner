"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/actions/marketplace";

/** Counts the profile view after the page has loaded in a real browser (decision 84). */
export function ViewTracker({ businessId }: { businessId: string }) {
  useEffect(() => {
    void recordViewAction(businessId);
  }, [businessId]);
  return null;
}
