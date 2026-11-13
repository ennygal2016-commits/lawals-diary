"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, Plus, Search, Send, SlidersHorizontal, Trash2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { contrastRatio } from "@/lib/contrast";
import { COLOR_GROUPS, tokenHex } from "@/lib/design-tokens";
import { MOODS, CATEGORIES } from "@/lib/moods";
import { PARTNERS } from "@/lib/site";
import { Avatar } from "@/components/ui/avatar";
import { InitialChip, MoodDot, VisibilityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, SegmentedFilter } from "@/components/ui/chip";
import { DailyCard } from "@/components/ui/daily-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea, TitleInput } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { TopBar } from "@/components/shell/top-bar";
import { BottomTabBar, QuickWriteButton } from "@/components/shell/bottom-nav";
import { MORE_NAV } from "@/lib/nav";

const A = PARTNERS.a;
const B = PARTNERS.b;
const TEXT_TOKENS = new Set([
  "fg",
  "fg-soft",
  "muted",
  "faint",
  "subtle",
  "accent",
  "lavender",
  "success",
  "warning",
  "danger",
]);

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 border-t border-divider pt-8">
      <h2 id={id} className="serif m-0 text-[32px] leading-none md:text-[34px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow m-0">{children}</p>;
}

function Swatches() {
  const bg = tokenHex("bg");
  return (
    <div className="flex flex-col gap-6">
      {COLOR_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <Label>{group.title}</Label>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {group.tokens.map((t) => (
              <li
                key={t.name}
                className="flex flex-col overflow-hidden rounded-btn border border-border bg-surface"
              >
                <span
                  aria-hidden
                  className="h-14 border-b border-border"
                  style={{ background: `var(--${t.name})` }}
                />
                <span className="flex flex-col gap-0.5 px-3 py-2.5">
                  <code className="font-mono text-[13px] text-fg">--{t.name}</code>
                  <span className="font-mono text-[12px] text-muted">{t.hex}</span>
                  <span className="text-[12px] leading-snug text-faint">{t.use}</span>
                  {TEXT_TOKENS.has(t.name) ? (
                    <span className="font-mono text-[11px] text-muted">
                      {contrastRatio(t.hex, bg).toFixed(2)}:1 on bg
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Typography() {
  const rows: [string, React.ReactNode][] = [
    [
      "Page title · Instrument Serif 64 / 44 phone",
      <span key="t" className="page-title">
        Timeline
      </span>,
    ],
    [
      "Greeting · Instrument Serif clamp(44–72) · nickname italic in partner colour",
      <span key="g" className="serif text-[42px] leading-[1.02] md:text-[clamp(44px,6vw,72px)]">
        Good evening, <em className="text-accent">{A.nickname}.</em>
      </span>,
    ],
    [
      "Month heading · Instrument Serif 32",
      <span key="m" className="serif text-[32px]">
        November 2026
      </span>,
    ],
    [
      "Wordmark · Instrument Serif 26",
      <span key="w" className="serif text-[26px]">
        Lawal&apos;s diary
      </span>,
    ],
    [
      "Scripture quote · Instrument Serif italic clamp(28–42)",
      <span key="s" className="serif text-[clamp(28px,3.4vw,42px)] leading-[1.18] italic">
        “Many waters cannot quench love.”
      </span>,
    ],
    [
      "Card quote · Instrument Serif italic 25 / 20 phone",
      <span key="c" className="serif text-[20px] italic md:text-[25px]">
        “A threefold cord is not quickly broken.”
      </span>,
    ],
    [
      "Eyebrow · Geist Mono 12 / 11 phone · 0.14em · uppercase",
      <span key="e" className="eyebrow">
        Scripture for today
      </span>,
    ],
    ["Body · Geist 16", <span key="b">What happened? Write it like you’d tell each other at dinner.</span>],
    [
      "Row title · Geist 17 / 500",
      <span key="r" className="text-[17px] font-medium">
        Rain on the train home
      </span>,
    ],
    [
      "Meta · Geist 13 muted, mono for dates",
      <span key="x" className="text-[13px] text-muted">
        <span className="font-mono">TUE 3</span> · Everyday · 2 comments
      </span>,
    ],
  ];
  return (
    <dl className="m-0 flex flex-col gap-5">
      {rows.map(([label, sample]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <dt className="font-mono text-[12px] text-faint">{label}</dt>
          <dd className="m-0">{sample}</dd>
        </div>
      ))}
    </dl>
  );
}

function RadiiAndShadows() {
  const radii = [
    ["input 10", "rounded-input"],
    ["button 12", "rounded-btn"],
    ["button-lg 14", "rounded-btn-lg"],
    ["card 20", "rounded-card"],
    ["panel 24", "rounded-panel"],
    ["hero 28", "rounded-hero"],
    ["chip 999", "rounded-full"],
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        {radii.map(([label, cls]) => (
          <div
            key={label}
            className={cn("flex h-20 w-28 items-end border border-border-strong bg-surface p-2", cls)}
          >
            <span className="font-mono text-[11px] text-muted">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-5">
        {[
          ["shadow-menu", "Menus, dialogs"],
          ["shadow-fab", "Quick-write"],
          ["shadow-glow", "Primary button"],
          ["shadow-glow-lavender", "Lavender CTA"],
        ].map(([cls, label]) => (
          <div key={cls} className={cn("flex h-20 w-40 items-end rounded-card bg-overlay p-3", cls)}>
            <span className="font-mono text-[11px] text-muted">{label}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[13px] text-faint">
        Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px (Tailwind 1 · 2 · 3 · 4 · 6 · 8 · 12 · 16).
      </p>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button>
          <Plus aria-hidden strokeWidth={2.2} />
          New entry
        </Button>
        <Button variant="secondary">
          <Send aria-hidden />
          Send note
        </Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="subtle" size="sm">
          Reply once
        </Button>
        <Button variant="inverse">Inverse</Button>
        <Button variant="danger">
          <Trash2 aria-hidden />
          Delete
        </Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg">Save entry</Button>
        <Button size="icon" variant="ghost" aria-label="Upload">
          <Upload aria-hidden />
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/entries/new?date=2026-11-03">Write about it</Link>
        </Button>
      </div>
      <Button size="block">
        <Plus aria-hidden strokeWidth={2.2} />
        New entry
      </Button>
    </div>
  );
}

function Chips() {
  const [vis, setVis] = React.useState<"all" | "private" | "public">("all");
  const [status, setStatus] = React.useState("all");
  const [category, setCategory] = React.useState("everyday");
  const statuses = [
    { value: "all", label: "All", count: 0 },
    { value: "new", label: "New", count: 0 },
    { value: "reviewing", label: "Reviewing", count: 0 },
    { value: "shortlisted", label: "Shortlisted", count: 0 },
    { value: "approved", label: "Approved", count: 0 },
    { value: "declined", label: "Declined", count: 0 },
    { value: "funded", label: "Funded (paid)", count: 0 },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Label>Segmented filter — click, or Tab then ← →</Label>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedFilter
          label="Visibility"
          value={vis}
          onValueChange={setVis}
          options={[
            { value: "all", label: "All" },
            { value: "private", label: "Private" },
            { value: "public", label: "Public" },
          ]}
        />
        <Chip dashed className="ml-auto">
          <SlidersHorizontal aria-hidden />
          More filters
        </Chip>
      </div>
      <Label>With counts</Label>
      <SegmentedFilter
        label="Application status"
        value={status}
        onValueChange={setStatus}
        options={statuses}
      />
      <Label>Category</Label>
      <SegmentedFilter
        label="Category"
        value={category}
        onValueChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
      />
    </div>
  );
}

function Inputs() {
  const [level, setLevel] = React.useState<string>("");
  return (
    <div className="flex flex-col gap-6">
      <Field label="Title" required>
        {(p) => <TitleInput {...p} placeholder="Give the day a name" maxLength={120} />}
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Date">{(p) => <Input {...p} type="date" defaultValue="2026-11-03" />}</Field>
        <Field label="Location">{(p) => <Input {...p} placeholder="Where were you?" />}</Field>
      </div>
      <Field label="Your note" hint="Only Kuleo can read this.">
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            maxLength={1000}
            showCount
            placeholder={`Something only ${B.nickname} needs to read…`}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level">
          {(p) => (
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]}>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                {["Primary", "Secondary", "Tertiary", "Vocational"].map((l) => (
                  <SelectItem key={l} value={l.toLowerCase()}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Email" error="Enter an email address like name@example.com.">
          {(p) => <Input {...p} type="email" defaultValue="not-an-email" />}
        </Field>
      </div>
      <div className="flex h-12 items-center gap-2.5 rounded-btn-lg border border-border bg-surface px-4">
        <Search aria-hidden className="size-[18px] text-muted" />
        <label htmlFor="sg-search" className="visually-hidden">
          Search entries
        </label>
        <input
          id="sg-search"
          placeholder="Search titles, words, places…"
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-fg focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="flex flex-col gap-4">
      <DailyCard
        kind="scripture"
        text="Many waters cannot quench love, neither can the floods drown it."
        attribution="Song of Solomon 8:7 · KJV"
        notice="King James Version — public domain."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <DailyCard
          kind="romance"
          text="Love alters not with his brief hours and weeks, but bears it out even to the edge of doom."
          attribution="William Shakespeare, Sonnet 116"
        />
        <DailyCard
          kind="love"
          isQuote={false}
          text={`Name one thing ${B.nickname} did this week that you haven’t said thank you for yet. Then say it.`}
          attribution="A small prompt"
        />
        <DailyCard
          kind="faith"
          text="A threefold cord is not quickly broken."
          attribution="Ecclesiastes 4:12 · KJV"
        />
        <DailyCard
          kind="encouragement"
          isQuote={false}
          text="The ordinary days are the ones you’ll want back. Write one down, even a short one."
          attribution="From your library"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>Default card</Card>
        <Card variant="accent">Accent border</Card>
        <Card variant="featured" padding="lg">
          Featured
        </Card>
      </div>
    </div>
  );
}

function Overlays() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">More menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {MORE_NAV.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>
                <item.icon strokeWidth={1.75} />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger">
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Leave a note for {B.nickname}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Leave a note for <em className="text-lavender">{B.nickname}</em>
            </DialogTitle>
            <DialogDescription>Only {B.nickname} can read it, and can reply once.</DialogDescription>
          </DialogHeader>
          <Field label="Your note">
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                maxLength={1000}
                showCount
                placeholder={`Something only ${B.nickname} needs to read…`}
              />
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="secondary" onClick={() => toast({ title: "Note sent" })}>
                <Send aria-hidden />
                Send note
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="subtle" size="sm" onClick={() => toast({ title: "Entry saved" })}>
        Show toast
      </Button>
      <Button
        variant="subtle"
        size="sm"
        onClick={() =>
          toast({
            title: "Couldn’t save",
            description: "Check your connection and try again.",
            variant: "danger",
          })
        }
      >
        Show error toast
      </Button>
    </div>
  );
}

function EmptyStates() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <EmptyState
        message="Nothing written on this day."
        variant="dashed"
        action={
          <Button asChild variant="secondary">
            <Link href="/admin/entries/new?date=2026-11-18">Write about it</Link>
          </Button>
        }
      />
      <EmptyState message="No applications yet" variant="dashed" icon={GraduationCap} />
      <EmptyState
        message="No entries yet. Write the first one."
        action={
          <Button variant="secondary">
            <Plus aria-hidden />
            New entry
          </Button>
        }
        className="md:col-span-2"
      />
    </div>
  );
}

function Identity() {
  const tints = ["#1e2633", "#2b1e2a"];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={A.displayName} partner="a" size="lg" />
        <Avatar name={A.displayName} partner="a" />
        <Avatar name={A.displayName} partner="a" size="sm" />
        <Avatar name={B.displayName} partner="b" size="lg" />
        <Avatar name={B.displayName} partner="b" />
        <Avatar name={B.displayName} partner="b" size="sm" />
        <InitialChip name={A.displayName} partner="a" />
        <InitialChip name={B.displayName} partner="b" />
        <InitialChip name={A.displayName} partner="a" size="sm" />
        <InitialChip name={B.displayName} partner="b" size="sm" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <VisibilityBadge visibility="private" />
        <VisibilityBadge visibility="public" />
        {(["private", "public"] as const).map((v, i) => (
          <div key={v} className="relative h-28 w-40 rounded-btn" style={{ background: tints[i] }}>
            <VisibilityBadge visibility={v} variant="overlay" className="absolute bottom-3 left-3" />
          </div>
        ))}
        {(["private", "public"] as const).map((v, i) => (
          <div key={`${v}-icon`} className="relative size-28 rounded-[8px]" style={{ background: tints[i] }}>
            <VisibilityBadge visibility={v} variant="icon" className="absolute bottom-2 left-2" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
        {MOODS.map((m) => (
          <MoodDot key={m.value} mood={m.value} />
        ))}
      </div>
    </div>
  );
}

function Shell() {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-card border border-border">
        <TopBar
          viewer={{
            displayName: A.displayName,
            nickname: A.nickname,
            partner: "a",
            avatarUrl: null,
            unreadCount: 3,
          }}
        />
      </div>
      {/* transform makes the fixed tab bar and quick-write position inside this frame */}
      <div className="relative h-56 overflow-hidden rounded-card border border-border bg-bg [transform:translateZ(0)]">
        <p className="m-0 p-4 text-[13px] text-faint">
          Phone tab bar and quick-write. The tab bar shows below 1024 px; see the 375 px preview.
        </p>
        <QuickWriteButton />
        <BottomTabBar />
      </div>
    </div>
  );
}

export function Styleguide({ embed }: { embed: boolean }) {
  return (
    <ToastProvider>
      <main
        id="main"
        className="mx-auto flex max-w-[1214px] flex-col gap-10 px-5 pt-8 pb-40 md:px-8 md:pt-14"
      >
        <header className="flex flex-col gap-3">
          <span className="eyebrow">Nocturne design system</span>
          <h1 className="page-title m-0">Styleguide</h1>
          <p className="m-0 max-w-[65ch] text-muted">
            Every token and component from docs/DESIGN.md. Tokens live in{" "}
            <code className="font-mono">src/app/globals.css</code>; components in{" "}
            <code className="font-mono">src/components/ui</code>.
          </p>
        </header>
        <Section id="sg-colours" title="Colour">
          <Swatches />
        </Section>
        <Section id="sg-type" title="Type">
          <Typography />
        </Section>
        <Section id="sg-radii" title="Radius, shadow, spacing">
          <RadiiAndShadows />
        </Section>
        <Section id="sg-buttons" title="Buttons">
          <Buttons />
        </Section>
        <Section id="sg-chips" title="Chips and segmented filters">
          <Chips />
        </Section>
        <Section id="sg-inputs" title="Inputs">
          <Inputs />
        </Section>
        <Section id="sg-cards" title="Cards and daily cards">
          <Cards />
        </Section>
        <Section id="sg-overlays" title="Menu, dialog, toast">
          <Overlays />
        </Section>
        <Section id="sg-empty" title="Empty states">
          <EmptyStates />
        </Section>
        <Section id="sg-identity" title="Avatar, initial chip, visibility, mood">
          <Identity />
        </Section>
        <Section id="sg-shell" title="App shell">
          <Shell />
        </Section>
        {!embed ? (
          <Section id="sg-phone" title="At 375 px">
            <p className="m-0 text-[13px] text-faint">This page rendered in a 375 px frame.</p>
            <iframe
              src="/styleguide?embed=1"
              title="Styleguide at 375 pixels wide"
              className="h-[1400px] w-[375px] max-w-full rounded-card border border-border-strong bg-bg"
            />
          </Section>
        ) : null}
      </main>
    </ToastProvider>
  );
}
