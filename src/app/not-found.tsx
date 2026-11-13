import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shell/wordmark";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-6 px-5 py-16">
      <Wordmark href="/" />
      <p className="eyebrow m-0">404</p>
      <h1 className="serif m-0 text-[44px] leading-[1.05] md:text-[56px]">This page isn’t in the diary.</h1>
      <p className="m-0 text-muted">It may have been moved, or it was never written.</p>
      <div>
        <Button asChild variant="secondary">
          <Link href="/">Go to the front page</Link>
        </Button>
      </div>
    </main>
  );
}
