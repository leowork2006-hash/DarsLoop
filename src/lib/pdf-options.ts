export const MAX_PDF_BYTES=8_000_000;
export const MAX_PDF_PAGES=40;
export const MAX_PDF_CHARACTERS=80_000;
export class PdfError extends Error {constructor(public code:string,message:string){super(message);}}
