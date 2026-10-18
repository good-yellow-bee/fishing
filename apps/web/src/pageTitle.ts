import { useEffect } from "react";

/** Names the browser tab after the page ("Lodge board · Stillwater"), so a screen reader and the tab list tell
 *  pages apart (WCAG 2.4.2); leaving puts the app's name back. The field log names its own pages in FieldShell. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(
    () => () => {
      document.title = "Stillwater";
    },
    [],
  );
}
