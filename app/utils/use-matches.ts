"use client";
import { useMatches as useRemixMatches } from "react-router";

export interface RouteHandle {
  bodyClassName?: string;
}

export interface AuthRouteHandle {
  title: string;
}

type Match<Handle> = Omit<ReturnType<typeof useRemixMatches>, "handle"> & {
  handle: Handle;
};

export function useMatches() {
  return useRemixMatches() as unknown as Array<Match<RouteHandle>>;
}

export function useAuthMatches() {
  return useRemixMatches() as unknown as Array<Match<AuthRouteHandle>>;
}
