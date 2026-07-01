import PocketBase from "pocketbase";

export const pocketBaseUrl = (import.meta.env.VITE_DATABASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

export const pb = new PocketBase(pocketBaseUrl);
