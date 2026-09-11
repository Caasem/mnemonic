// Hand-authored ambient type declarations for the subset of React/ReactDOM APIs
// this app uses. The npm registry was unreachable in the environment this
// project was originally built in, so @types/react / @types/react-dom could
// not be installed there; the actual `react` and `react-dom` runtime packages
// were present and worked correctly — this file existed purely to give
// `tsc --noEmit` real signal instead of failing on missing type declarations.
//
// *** DELETE THIS FILE once you've run `npm install` on a machine with normal
// registry access *** — package.json already lists @types/react and
// @types/react-dom as devDependencies, and this hand-rolled shim will conflict
// with (or just be redundant with) the real thing.

declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type Key = string | number;
  type FC<P = {}> = (props: P) => any;
  interface CSSProperties {
    [key: string]: any;
  }
  interface SVGProps<T> {
    [key: string]: any;
  }
  interface KeyboardEvent<T = Element> {
    key: string;
    shiftKey: boolean;
    preventDefault(): void;
    [key: string]: any;
  }
  interface ChangeEvent<T = Element> {
    target: T & { value: string; checked?: boolean };
    [key: string]: any;
  }
  interface FormEvent<T = Element> {
    preventDefault(): void;
    [key: string]: any;
  }
  interface MouseEvent<T = Element> {
    stopPropagation(): void;
    preventDefault(): void;
    [key: string]: any;
  }
}

declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export type Key = string | number;
  export type FC<P = {}> = (props: P) => any;

  export interface CSSProperties {
    [key: string]: any;
  }

  export interface SVGProps<T> {
    [key: string]: any;
  }

  export interface KeyboardEvent<T = Element> {
    key: string;
    shiftKey: boolean;
    preventDefault(): void;
    [key: string]: any;
  }

  export interface ChangeEvent<T = Element> {
    target: T & { value: string; checked?: boolean };
    [key: string]: any;
  }

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    [key: string]: any;
  }

  export interface MouseEvent<T = Element> {
    stopPropagation(): void;
    preventDefault(): void;
    [key: string]: any;
  }

  export function createElement(...args: any[]): any;
  export function createContext<T>(defaultValue: T): {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
  };
  export function useContext<T>(context: any): T;
  export function useState<S>(initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useRef<T = undefined>(): { current: T | undefined };

  export const StrictMode: FC<{ children?: ReactNode }>;

  const ReactDefault: {
    createElement: typeof createElement;
    Fragment: any;
    StrictMode: typeof StrictMode;
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    createContext: typeof createContext;
    useContext: typeof useContext;
  };
  export default ReactDefault;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: any): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends Object {
    [key: string]: any;
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
