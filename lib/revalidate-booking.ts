import { revalidatePath } from "next/cache";

/** Bust Next.js caches for public booking + gestionale after appointment mutations. */
export function revalidateBookingPaths() {
  revalidatePath("/");
  revalidatePath("/gestionale");
  revalidatePath("/prenota");
}
