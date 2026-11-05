"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deletePhotoAction, movePhotoAction, uploadPhotosAction } from "@/actions/vendor";
import { buttonClass } from "@/components/ui/button";
import type { ErrorKey } from "@/lib/form";
import { cn } from "@/lib/utils";

export type PhotoItem = { id: string; url: string };

/** Upload + reorder + delete for one photo set (profile photos, or one portfolio gallery). */
export function PhotoManager({
  businessId,
  galleryId,
  photos,
  canUpload,
}: {
  businessId: string;
  galleryId: string | null;
  photos: PhotoItem[];
  canUpload: boolean;
}) {
  const t = useTranslations("vendor.photos");
  const te = useTranslations("errors");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    // One request per photo keeps each upload under the server's size limit.
    for (const [i, file] of list.entries()) {
      const fd = new FormData();
      fd.append("photos", file);
      const res = await uploadPhotosAction(businessId, galleryId, {}, fd);
      const key = res.fieldErrors?.photos ?? (res.formError && res.formError !== "emailTaken" ? res.formError : null);
      if (key) {
        setError(key);
        if (key === "photoLimit") break;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
  }

  const act = (fn: () => Promise<unknown>) => start(async () => void (await fn()));

  return (
    <div className="space-y-4">
      {photos.length === 0 ? (
        <p className="text-sm text-stone">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="group relative overflow-hidden rounded-xl border border-line bg-linen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              {i === 0 && galleryId === null && (
                <span className="absolute left-2 top-2 rounded-full bg-vranec px-2 py-0.5 text-[11px] font-medium text-white">
                  {t("cover")}
                </span>
              )}
              <div className="flex items-center justify-between gap-1 border-t border-line bg-surface px-1.5 py-1">
                <div className="flex">
                  <IconButton label={t("moveLeft")} disabled={pending || i === 0} onClick={() => act(() => movePhotoAction(businessId, p.id, "left"))}>
                    <ArrowLeft className="size-4" />
                  </IconButton>
                  <IconButton
                    label={t("moveRight")}
                    disabled={pending || i === photos.length - 1}
                    onClick={() => act(() => movePhotoAction(businessId, p.id, "right"))}
                  >
                    <ArrowRight className="size-4" />
                  </IconButton>
                  {galleryId === null && i > 0 && (
                    <IconButton label={t("makeCover")} disabled={pending} onClick={() => act(() => movePhotoAction(businessId, p.id, "cover"))}>
                      <Star className="size-4" />
                    </IconButton>
                  )}
                </div>
                <IconButton label={t("delete")} disabled={pending} onClick={() => act(() => deletePhotoAction(businessId, p.id))}>
                  <Trash2 className="size-4 text-danger" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className={buttonClass("secondary", "md", cn("cursor-pointer", progress && "pointer-events-none opacity-60"))}>
            <ImagePlus aria-hidden className="size-4" />
            {progress ? `${t("uploading")} ${progress.done}/${progress.total}` : t("upload")}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-sm text-stone">{t("uploadHint")}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {te(error)}
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-linen hover:text-ink disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}
