"use client";

import * as React from "react";

import type { UploadResponse } from "@/app/api/photos/upload/route";
import { UPLOAD_BUDGET_BYTES, UPLOAD_BUDGET_LABEL, shrinkImage } from "@/lib/images/shrink";

export type UploadedPhoto = UploadResponse["photos"][number];

export type UploadItem = {
  key: string;
  name: string;
  size: number;
  /** 0–100, bytes sent */
  progress: number;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  message?: string;
};

const MAX_BYTES = 25 * 1024 * 1024;
const LOOKS_LIKE_IMAGE = /\.(jpe?g|png|webp|heic|heif)$/i;

/** One file per request, so each file has its own progress and a failure never sinks the batch. */
function send(file: File, onProgress: (pct: number) => void, onSent: () => void): Promise<UploadResponse> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.upload.onload = onSent;
    xhr.onload = () => {
      const body = xhr.response as UploadResponse | null;
      resolve(body ?? { photos: [], errors: [], error: "The server didn’t answer. Try again." });
    };
    xhr.onerror = () => resolve({ photos: [], errors: [], error: "The upload was interrupted. Try again." });
    const form = new FormData();
    form.append("photos", file);
    xhr.send(form);
  });
}

/**
 * Upload queue (PRD FR-23): multi-select or drop, per-file progress, two at a time. Each finished photo is handed
 * to `onUploaded` as soon as it is ready.
 */
export function usePhotoUploads({
  onUploaded,
  concurrency = 2,
}: {
  onUploaded: (photo: UploadedPhoto) => void;
  concurrency?: number;
}) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const queue = React.useRef<Array<{ key: string; file: File }>>([]);
  const active = React.useRef(0);
  const onUploadedRef = React.useRef(onUploaded);
  React.useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  const patch = React.useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));
  }, []);

  const pump = React.useCallback(() => {
    while (active.current < concurrency && queue.current.length > 0) {
      const next = queue.current.shift()!;
      active.current += 1;
      patch(next.key, { status: "uploading" });
      // Resized to ≤ 2400 px in the browser first, so each request stays under the hosting limit.
      void shrinkImage(next.file)
        .then((file) =>
          file.size > UPLOAD_BUDGET_BYTES
            ? ({
                photos: [],
                errors: [],
                error: `This browser can’t shrink this photo below ${UPLOAD_BUDGET_LABEL}. Save it as a JPEG and try again.`,
              } satisfies UploadResponse)
            : send(
                file,
                (progress) => patch(next.key, { progress }),
                () => patch(next.key, { progress: 100, status: "processing" }),
              ),
        )
        .then((result) => {
          active.current -= 1;
          const photo = result.photos[0];
          if (photo) {
            patch(next.key, { status: "done", progress: 100 });
            onUploadedRef.current(photo);
          } else {
            patch(next.key, {
              status: "error",
              message: result.errors[0]?.message ?? result.error ?? "Couldn’t upload this photo.",
            });
          }
          pump();
        });
    }
  }, [concurrency, patch]);

  const add = React.useCallback(
    (files: Iterable<File>, limit = Infinity) => {
      const accepted: UploadItem[] = [];
      let room = limit;
      for (const file of files) {
        const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
        const base = { key, name: file.name, size: file.size, progress: 0 };
        if (room <= 0) {
          accepted.push({ ...base, status: "error", message: "No room — this entry already has 20 photos." });
          continue;
        }
        if (!file.type.startsWith("image/") && !LOOKS_LIKE_IMAGE.test(file.name)) {
          accepted.push({ ...base, status: "error", message: "Not a photo." });
          continue;
        }
        if (file.size > MAX_BYTES) {
          accepted.push({ ...base, status: "error", message: "Over 25 MB." });
          continue;
        }
        room -= 1;
        accepted.push({ ...base, status: "queued" });
        queue.current.push({ key, file });
      }
      setItems((list) => [...list, ...accepted]);
      pump();
    },
    [pump],
  );

  const dismiss = React.useCallback(
    (key: string) => setItems((list) => list.filter((i) => i.key !== key)),
    [],
  );
  const clearFinished = React.useCallback(
    () => setItems((list) => list.filter((i) => i.status !== "done" && i.status !== "error")),
    [],
  );

  const busy = items.some(
    (i) => i.status === "queued" || i.status === "uploading" || i.status === "processing",
  );
  const pending = items.filter(
    (i) => i.status === "queued" || i.status === "uploading" || i.status === "processing",
  ).length;
  return { items, add, dismiss, clearFinished, busy, pending };
}
