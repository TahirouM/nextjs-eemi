import type { ReactNode } from "react";

/**
 * Layout racine.
 *
 * Il ne rend volontairement ni <html> ni <body> : c'est le layout de
 * `[locale]` qui le fait, car lui seul connaît la langue à déclarer dans
 * `<html lang>`. Next.js exige néanmoins un layout à la racine.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
