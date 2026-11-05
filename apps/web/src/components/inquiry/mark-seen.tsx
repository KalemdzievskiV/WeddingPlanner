"use client";

import { useEffect } from "react";
import { markInquirySeenAction } from "@/actions/inquiries";

/** Marks the open thread as read once it's on screen, so unread badges update everywhere. */
export function MarkSeen({ inquiryId, side, unread }: { inquiryId: string; side: "couple" | "vendor"; unread: boolean }) {
  useEffect(() => {
    if (unread) void markInquirySeenAction(inquiryId, side);
  }, [inquiryId, side, unread]);
  return null;
}
