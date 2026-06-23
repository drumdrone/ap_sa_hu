// Client-side PDF password protection for POSM materials.
// Lazy-loads the encryption library so the main bundle stays small —
// it's only needed when an admin marks a PDF as password-protected.

import { POSM_PDF_PASSWORD } from "./portal-password";

export type EncryptedPdf = {
  blob: Blob;
  filename: string;
};

// Encrypt a PDF File with the portal password (RC4 128-bit, PDF-standard).
// The resulting Blob can be uploaded to Convex storage the same way as the
// original file. Throws if the input is not a PDF or encryption fails.
export async function encryptPdfWithPortalPassword(file: File): Promise<EncryptedPdf> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Lze zaheslovat pouze PDF soubory");
  }

  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt-lite");
  const input = new Uint8Array(await file.arrayBuffer());
  const encrypted = await encryptPDF(input, POSM_PDF_PASSWORD);

  return {
    blob: new Blob([encrypted as BlobPart], { type: "application/pdf" }),
    filename: file.name,
  };
}
