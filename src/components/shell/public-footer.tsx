import { SITE_NAME } from "@/lib/site";

export function PublicFooter() {
  const host = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "");
  return (
    <footer className="border-t border-divider">
      <div className="mx-auto flex max-w-[1214px] flex-wrap justify-between gap-2 px-5 py-6 font-mono text-[12px] text-faint md:px-8">
        <span className="uppercase">
          {SITE_NAME}
          {host ? ` · ${host}` : ""}
        </span>
        <span>Only what we choose to share appears here.</span>
      </div>
    </footer>
  );
}
