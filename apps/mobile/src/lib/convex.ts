import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl, {
  expectAuth: true,
});

export const publicConvex = new ConvexHttpClient(convexUrl);
