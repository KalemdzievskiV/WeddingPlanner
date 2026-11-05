import { prisma } from "@svadba/db";
import { PHOTO_LIMITS } from "@svadba/shared";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { DeleteGalleryButton, NewGalleryForm } from "@/components/vendor/gallery-controls";
import { ItemEditor } from "@/components/vendor/item-editor";
import { PhotoManager } from "@/components/vendor/photo-manager";
import { getBusinessAccess } from "@/lib/business";

export default async function BusinessPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business } = access;
  const t = await getTranslations("vendor.photos");

  const [photos, galleries, videos] = await Promise.all([
    prisma.photo.findMany({ where: { businessId: id, galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    business.category === "PHOTO_VIDEO"
      ? prisma.portfolioGallery.findMany({
          where: { businessId: id },
          orderBy: { sortOrder: "asc" },
          include: { photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
        })
      : Promise.resolve([]),
    prisma.videoLink.findMany({ where: { businessId: id }, orderBy: { sortOrder: "asc" } }),
  ]);
  const max = PHOTO_LIMITS[business.category];
  const used = photos.length + galleries.reduce((n, g) => n + g.photos.length, 0);
  const canUpload = used < max;

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-7">
        <h2 className="font-display text-xl">{business.category === "PHOTO_VIDEO" ? t("mainPhotos") : t("title")}</h2>
        <p className="mb-5 mt-1 text-sm text-stone">{t("lead", { count: used, max })}</p>
        <PhotoManager businessId={id} galleryId={null} photos={photos} canUpload={canUpload} />
      </Card>

      {business.category === "PHOTO_VIDEO" && (
        <Card className="space-y-6 p-6 sm:p-7">
          <div>
            <h2 className="font-display text-xl">{t("galleries")}</h2>
            <p className="mt-1 text-sm text-stone">{t("galleriesLead")}</p>
          </div>
          {galleries.map((g) => (
            <section key={g.id} className="space-y-3 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{g.title}</h3>
                <DeleteGalleryButton businessId={id} galleryId={g.id} title={g.title} />
              </div>
              <PhotoManager businessId={id} galleryId={g.id} photos={g.photos} canUpload={canUpload} />
            </section>
          ))}
          <div className="border-t border-line pt-5">
            <NewGalleryForm businessId={id} />
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-7">
        <h2 className="font-display text-xl">{t("videos")}</h2>
        <p className="mb-5 mt-1 text-sm text-stone">{t("videosLead")}</p>
        <ItemEditor
          kind="video"
          businessId={id}
          currency={business.currency}
          addLabel={t("addVideo")}
          items={videos.map((v) => ({ id: v.id, title: v.url, details: [], values: { url: v.url } }))}
        />
      </Card>
    </div>
  );
}
