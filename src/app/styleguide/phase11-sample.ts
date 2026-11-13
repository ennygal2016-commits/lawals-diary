import type { AboutDraft } from "@/lib/about";
import type { BookDetail, Reader, ShelfBook } from "@/server/queries/books";
import type { StoryData } from "@/server/queries/about";

/** Sample data for the Phase 11 dev previews (no database). Images are inline SVGs. */
export function svgPhoto(label: string, tint: string, w = 1200, h = 800): string {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${tint}"/><circle cx="70%" cy="35%" r="${h / 6}" fill="#fff" opacity=".5"/><text x="5%" y="90%" font-family="monospace" font-size="${h / 12}" fill="#0e0c14">${label}</text></svg>`,
    )
  );
}

function svgCover(title: string, tint: string): string {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="${tint}"/><text x="30" y="120" font-family="Georgia" font-size="40" fill="#0e0c14">${title}</text></svg>`,
    )
  );
}

export const SAMPLE_PARTNERS: Reader[] = [
  { userId: "00000000-0000-4000-8000-0000000000a1", name: "Nurat", partner: "a" },
  { userId: "00000000-0000-4000-8000-0000000000b2", name: "Afeez", partner: "b" },
];

const [a, b] = SAMPLE_PARTNERS as [Reader, Reader];

export const SAMPLE_BOOKS: ShelfBook[] = [
  {
    id: "00000000-0000-4000-8000-00000000b001",
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    status: "reading",
    coverUrl: svgCover("Things Fall Apart", "#ffc98a"),
    readers: [a, b],
    rating: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000b002",
    title: "The Four Loves",
    author: "C. S. Lewis",
    status: "reading",
    coverUrl: null,
    readers: [b],
    rating: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000b003",
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    status: "want_to_read",
    coverUrl: svgCover("Half of a Yellow Sun", "#ff8a9b"),
    readers: [],
    rating: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000b004",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    status: "finished",
    coverUrl: svgCover("Pride and Prejudice", "#b9a6ff"),
    readers: [a],
    rating: 5,
  },
  {
    id: "00000000-0000-4000-8000-00000000b005",
    title: "Gilead",
    author: "Marilynne Robinson",
    status: "finished",
    coverUrl: svgCover("Gilead", "#7ec8e0"),
    readers: [a, b],
    rating: 4,
  },
];

export const SAMPLE_BOOK: BookDetail = {
  ...SAMPLE_BOOKS[3]!,
  isbn: "9780141439518",
  startedOn: "2026-09-01",
  finishedOn: "2026-10-12",
  notes: "Read it aloud on the train, a chapter a day.",
  quotes: [
    {
      id: "q1",
      text: "I declare after all there is no enjoyment like reading!",
      page: "54",
      addedBy: "Nurat",
      mine: true,
    },
    {
      id: "q2",
      text: "There is a stubbornness about me that never can bear to be frightened.",
      page: null,
      addedBy: "Afeez",
      mine: false,
    },
  ],
};

const P = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const SAMPLE_ABOUT: AboutDraft = {
  couple_names: "Nurat & Afeez",
  hero_photo_id: P(1),
  story_json: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "We met at a friend’s wedding, both pretending not to know the songs." },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Three years, two cities and one very patient church later, this is the diary we keep together.",
          },
        ],
      },
    ],
  },
  milestones: [
    { id: "m1", date: "2021-06-12", title: "We met", text: "A wedding in Lagos.", photo_id: null },
    { id: "m2", date: "2021-09-04", title: "First date", text: "Suya and a long walk.", photo_id: P(2) },
    {
      id: "m3",
      date: "2022-12-24",
      title: "The proposal",
      text: "Christmas Eve, under the lights.",
      photo_id: null,
    },
    {
      id: "m4",
      date: "2023-05-08",
      title: "Our wedding",
      text: "Family from three countries.",
      photo_id: P(3),
    },
  ],
  photo_ids: [P(4), P(5), P(6), P(7), P(8)],
};

const TINTS = ["#7ec8e0", "#ff8a9b", "#b9a6ff", "#ffc98a", "#7ee0b5", "#d6a3c9", "#6f8fd1", "#a49db0"];
export const SAMPLE_THUMBS: Record<string, string> = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [P(n), svgPhoto(`#${n}`, TINTS[n - 1]!, 400, 300)]),
);

export const SAMPLE_STORY: StoryData = {
  coupleNames: SAMPLE_ABOUT.couple_names,
  since: "2021",
  heroUrl: svgPhoto("hero", "#2a1e28", 1600, 700),
  story: SAMPLE_ABOUT.story_json,
  milestones: SAMPLE_ABOUT.milestones.map((m) => ({
    ...m,
    photoUrl: m.photo_id ? (SAMPLE_THUMBS[m.photo_id] ?? null) : null,
  })),
  gallery: SAMPLE_ABOUT.photo_ids.map((id) => ({ id, url: SAMPLE_THUMBS[id]!, caption: null })),
};
