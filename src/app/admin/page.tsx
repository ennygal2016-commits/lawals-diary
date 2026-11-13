import type { Metadata } from "next";

import { HomeView } from "@/components/home/home-view";
import { getHomeData } from "@/server/queries/home";
import { getViewer } from "@/server/queries/viewer";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const viewer = await getViewer();
  const now = new Date();
  const data = await getHomeData(viewer, now);
  return <HomeView viewer={viewer} data={data} now={now} />;
}
