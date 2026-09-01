import { createServerFn } from "@tanstack/react-start";

import type { Ipo } from "./ipo.server";

export type { Ipo, IpoBoard, IpoStatus } from "./ipo.server";

export type IpoFeed = { ipos: Ipo[]; error: string | null };

export const getIpos = createServerFn({ method: "GET" }).handler(async (): Promise<IpoFeed> => {
  try {
    const { fetchIpos } = await import("./ipo.server");
    return { ipos: await fetchIpos(), error: null };
  } catch (err) {
    console.error("IPO feed failed", err);
    return {
      ipos: [],
      error: "The IPO tracker is unreachable right now. Try again in a moment.",
    };
  }
});
