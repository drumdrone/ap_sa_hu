// Hardcoded access passwords shared with components/access-gate.tsx.
// Keep all references in one place so the POSM PDF encryption flow stays
// in sync with what the login screen accepts.

export const PORTAL_VIEWER_PASSWORD = "view5678";
export const PORTAL_EDITOR_PASSWORD = "edit5678";

// Password used to encrypt POSM PDFs marked as "requires password".
// Uses the viewer password so anyone who can log into the portal can open
// the file.
export const POSM_PDF_PASSWORD = PORTAL_VIEWER_PASSWORD;
