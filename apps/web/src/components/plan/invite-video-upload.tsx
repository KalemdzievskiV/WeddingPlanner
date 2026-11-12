"use client";

import { INVITE_VIDEO_ACCEPT, INVITE_VIDEO_MAX_BYTES } from "@svadba/shared";
import { Film, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const MB = 1024 * 1024;

/**
 * Uploads the invitation video from the couple's computer or phone (decision 131). One per wedding:
 * uploading a new one replaces the old. Sent straight to a Route Handler with a progress bar,
 * since videos are too big for a Server Action.
 */
export function InviteVideoUpload({ file, editable, onChange }: { file: string | null; editable: boolean; onChange: (url: string | null) => void }) {
  const t = useTranslations("plan.invite");
  const te = useTranslations("errors");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const busy = progress != null || removing;

  function upload(f: File) {
    setError(null);
    if (f.size > INVITE_VIDEO_MAX_BYTES) {
      setError("videoSize");
      return;
    }
    // XHR rather than fetch: it reports upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/invite-video");
    xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        /* handled below */
      }
      if (xhr.status === 200 && body.url) {
        onChange(body.url);
        router.refresh();
      } else {
        setError(body.error ?? (xhr.status === 413 ? "videoSize" : "generic"));
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("generic");
    };
    setProgress(0);
    xhr.send(f);
  }

  async function remove() {
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch("/api/invite-video", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      onChange(null);
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("videoFile")}</p>
      <p className="text-sm text-stone">{t("videoFileHint", { mb: INVITE_VIDEO_MAX_BYTES / MB })}</p>
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
          <Film aria-hidden className="size-5 shrink-0 text-vranec" />
          <span className="min-w-0 flex-1 truncate text-sm">{t("videoFileSet")}</span>
          {editable && (
            <Button type="button" variant="ghost" onClick={remove} disabled={busy} aria-label={t("videoFileRemove")} title={t("videoFileRemove")}>
              <Trash2 aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      )}
      {editable && (
        <>
          <input
            ref={input}
            type="file"
            accept={INVITE_VIDEO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            <Upload aria-hidden className="size-4" /> {file ? t("videoFileReplace") : t("videoFileUpload")}
          </Button>
        </>
      )}
      {progress != null && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("videoFileUploading")} className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-vranec transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs tabular-nums text-stone">{t("videoFileUploading")} {progress}%</p>
        </div>
      )}
      {error && <Alert tone="error">{te(error as "generic")}</Alert>}
    </div>
  );
}
