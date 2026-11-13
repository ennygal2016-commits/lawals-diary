import Link from "next/link";

import { Button } from "@/components/ui/button";

/** 404 inside the admin shell (a deleted entry, a book that's gone): keeps the navigation. */
export default function AdminNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-5 py-16 md:py-24">
      <p className="eyebrow m-0">404</p>
      <h1 className="serif m-0 text-[40px] leading-[1.05] md:text-[52px]">This page isn’t in the diary.</h1>
      <p className="m-0 text-muted">It may have been deleted, or it was never written.</p>
      <div>
        <Button asChild variant="secondary">
          <Link href="/admin">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
