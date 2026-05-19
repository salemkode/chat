declare module "culori" {
  export function parse(color: string): { alpha?: number } | undefined;
  export function formatHex(color: { alpha?: number }): string;
  export function formatHex8(color: { alpha?: number }): string;
}

declare module "culori/require" {
  export function parse(color: string): { alpha?: number } | undefined;
  export function formatHex(color: { alpha?: number }): string;
  export function formatHex8(color: { alpha?: number }): string;
}
