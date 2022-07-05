import { useMatches as useRemixMatches } from "@remix-run/react";

export interface RouteHandle {
  bodyClassName?: string;
}

export type Match = Omit<ReturnType<typeof useRemixMatches>, "handle"> & {
  handle: RouteHandle;
};


export function useMatches() {
  return useRemixMatches() as unknown as Array<Match>;
}
