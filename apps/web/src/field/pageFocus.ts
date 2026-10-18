/**
 * Focus the top of the page: the place a page names with data-focus-target, else its heading, else the page itself.
 * Made focusable first, so focus never falls to the document when a bar or button it came from goes away.
 */
export function focusPageHeading(options?: FocusOptions) {
  const main = document.getElementById("field-main") ?? document.querySelector<HTMLElement>(".field-main");
  const heading = main?.querySelector<HTMLElement>("[data-focus-target]") ?? main?.querySelector<HTMLElement>("h1") ?? main;
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus(options);
}
