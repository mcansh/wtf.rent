import type { useMatches } from "remix";

export interface RouteHandle {
  bodyClassName?: string;
}

export type Match = Omit<ReturnType<typeof useMatches>, "handle"> & {
  handle: RouteHandle;
};
