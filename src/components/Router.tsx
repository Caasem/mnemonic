// Minimal hash-based router — avoids depending on react-router (registry
// unreachable) since Mnemonic only ever needs 4 top-level routes plus params.
import React, { createContext, useContext, useEffect, useState } from "react";

export type Route = { path: string; params: URLSearchParams };

function readRoute(): Route {
  const hash = window.location.hash.slice(1) || "/memory";
  const [path, query] = hash.split("?");
  return { path: path || "/memory", params: new URLSearchParams(query ?? "") };
}

const RouterContext = createContext<Route>(readRoute());

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(readRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return <RouterContext.Provider value={route}>{children}</RouterContext.Provider>;
}

export function useRoute(): Route {
  return useContext(RouterContext);
}

export function navigate(path: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  window.location.hash = path + qs;
}
