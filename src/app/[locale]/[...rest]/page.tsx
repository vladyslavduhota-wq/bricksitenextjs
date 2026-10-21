import { notFound } from "next/navigation";

/** Sends unknown paths to the localized not-found page. */
export default function CatchAll() {
  notFound();
}
