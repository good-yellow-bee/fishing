/** The id the forms give their save error, so a marked field can point at it. */
export const FORM_ERROR_ID = "form-error";

/** The book's names for fields that the forms call something shorter. */
const INPUT_NAMES: Record<string, string> = { spotId: "spot", tripId: "trip" };

/** Clears any field marked wrong by an earlier save. */
export function clearInvalid(form: HTMLFormElement): void {
  for (const input of form.querySelectorAll('[aria-invalid="true"]')) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

/** Marks the field a save turned down and moves focus to it, so the fix starts where the problem is. */
export function markInvalid(form: HTMLFormElement, field: string | undefined): void {
  clearInvalid(form);
  if (!field) return;
  const input = form.querySelector<HTMLElement>(`[name="${INPUT_NAMES[field] ?? field}"]`);
  if (!input) return;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", FORM_ERROR_ID);
  input.focus();
}
