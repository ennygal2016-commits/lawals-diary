"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { PartnerKey } from "@/lib/site";
import { cropSquare } from "@/lib/images/shrink";
import { removeAvatar, uploadAvatar } from "@/server/actions/profile";

const FRAME = 280; // crop frame, CSS px
const MAX_ZOOM = 4;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

type Picked = { file: File; url: string; width: number; height: number };
type View = { zoom: number; ox: number; oy: number };

/** Keep the image covering the frame: offsets are the image's top-left relative to the frame (≤ 0). */
function clampView(view: View, img: Picked): View {
  const zoom = Math.min(Math.max(view.zoom, 1), MAX_ZOOM);
  const scale = (FRAME / Math.min(img.width, img.height)) * zoom;
  const minX = FRAME - img.width * scale;
  const minY = FRAME - img.height * scale;
  return {
    zoom,
    ox: Math.min(0, Math.max(minX, view.ox)),
    oy: Math.min(0, Math.max(minY, view.oy)),
  };
}

function centred(img: Picked): View {
  const scale = FRAME / Math.min(img.width, img.height);
  return { zoom: 1, ox: (FRAME - img.width * scale) / 2, oy: (FRAME - img.height * scale) / 2 };
}

/** The square, in the image's own (orientation-corrected) pixels, that the frame currently shows. */
function cropOf(view: View, img: Picked) {
  const scale = (FRAME / Math.min(img.width, img.height)) * view.zoom;
  const size = Math.min(Math.round(FRAME / scale), img.width, img.height);
  return {
    x: Math.max(0, Math.min(Math.round(-view.ox / scale), img.width - size)),
    y: Math.max(0, Math.min(Math.round(-view.oy / scale), img.height - size)),
    size,
  };
}

export function AvatarEditor({
  name,
  partner,
  avatarUrl,
}: {
  name: string;
  partner: PartnerKey;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [picked, setPicked] = React.useState<Picked | null>(null);
  const [view, setView] = React.useState<View>({ zoom: 1, ox: 0, oy: 0 });
  const [pending, startTransition] = React.useTransition();
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  React.useEffect(() => () => (picked ? URL.revokeObjectURL(picked.url) : undefined), [picked]);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast({ title: "Choose a JPEG, PNG or WebP image.", variant: "danger" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Choose an image under 10 MB.", variant: "danger" });
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      // naturalWidth/Height already follow EXIF orientation in current browsers — the same pixels sharp crops.
      const img = { file, url, width: probe.naturalWidth, height: probe.naturalHeight };
      setPicked(img);
      setView(centred(img));
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast({ title: "That image couldn’t be opened.", variant: "danger" });
    };
    probe.src = url;
  }

  function update(next: Partial<View>) {
    if (!picked) return;
    setView((prev) => {
      const merged = { ...prev, ...next };
      if (next.zoom !== undefined && next.zoom !== prev.zoom) {
        // Zoom around the frame centre.
        const ratio = merged.zoom / prev.zoom;
        merged.ox = FRAME / 2 - (FRAME / 2 - prev.ox) * ratio;
        merged.oy = FRAME / 2 - (FRAME / 2 - prev.oy) * ratio;
      }
      return clampView(merged, picked);
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 40 : 10;
    const moves: Record<string, Partial<View>> = {
      ArrowLeft: { ox: view.ox + step },
      ArrowRight: { ox: view.ox - step },
      ArrowUp: { oy: view.oy + step },
      ArrowDown: { oy: view.oy - step },
      "+": { zoom: view.zoom + 0.1 },
      "=": { zoom: view.zoom + 0.1 },
      "-": { zoom: view.zoom - 0.1 },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      update(move);
    }
  }

  function save() {
    if (!picked) return;
    const crop = cropOf(view, picked);
    startTransition(async () => {
      // Cropped in the browser to a ≤ 1024 px square (keeps the upload small); the server crops the whole of it.
      const square = await cropSquare(picked.url, crop, picked.file.name);
      const data = new FormData();
      if (square) {
        const side = Math.min(1024, crop.size);
        data.set("avatar", square);
        data.set("x", "0");
        data.set("y", "0");
        data.set("size", String(side));
      } else {
        data.set("avatar", picked.file);
        data.set("x", String(crop.x));
        data.set("y", String(crop.y));
        data.set("size", String(crop.size));
      }
      const result = await uploadAvatar(data);
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
      if (result.ok) {
        setPicked(null);
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeAvatar();
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
      if (result.ok) router.refresh();
    });
  }

  const scale = picked ? (FRAME / Math.min(picked.width, picked.height)) * view.zoom : 1;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} partner={partner} src={avatarUrl} size="lg" className="size-20 text-2xl" />
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[15px] text-fg">Profile photo</p>
        <p className="m-0 text-[13px] text-faint">
          JPEG, PNG or WebP, up to 10 MB. Location data is removed.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={pending}>
            <ImageUp aria-hidden strokeWidth={1.75} />
            {avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          {avatarUrl ? (
            <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
              <Trash2 aria-hidden strokeWidth={1.75} />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Choose a profile photo"
          onChange={onFile}
          data-testid="avatar-file"
        />
      </div>

      <Dialog open={picked !== null} onOpenChange={(open) => (open ? null : setPicked(null))}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
            <DialogDescription>
              Drag or use the arrow keys to move it. Zoom with the slider or + and −.
            </DialogDescription>
          </DialogHeader>

          {picked ? (
            <div className="flex flex-col items-center gap-5">
              <div
                role="group"
                tabIndex={0}
                aria-label="Crop area"
                aria-roledescription="image cropper"
                onKeyDown={onKeyDown}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  update({
                    ox: drag.current.ox + (e.clientX - drag.current.x),
                    oy: drag.current.oy + (e.clientY - drag.current.y),
                  });
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                className="relative cursor-grab touch-none overflow-hidden rounded-tile bg-raised select-none active:cursor-grabbing"
                style={{ width: FRAME, height: FRAME }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, never optimised */}
                <img
                  src={picked.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
                  style={{
                    width: picked.width * scale,
                    height: picked.height * scale,
                    transform: `translate(${view.ox}px, ${view.oy}px)`,
                  }}
                />
                {/* Round preview mask */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(14,12,20,0.6)] ring-1 ring-fg/40"
                />
              </div>

              <label className="flex w-full items-center gap-3">
                <span className="eyebrow shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={view.zoom}
                  onChange={(e) => update({ zoom: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
