import { Worker } from "node:worker_threads";
import path from "node:path";
import { MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_PDF_CHARACTERS, PdfError } from "./pdf-options";
import { instructionLike } from "./evidence";
import type { PdfPage } from "./types";
const workerSource=String.raw`
const {parentPort,workerData}=require('node:worker_threads');
(async()=>{
  let pdf;
  try {
    const {getDocumentProxy}=require("node:module").createRequire(workerData.packageFile)("unpdf");
    pdf=await getDocumentProxy(new Uint8Array(workerData.bytes),{isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true,verbosity:0});
    // Also reject PDFs encrypted with an empty password. No passwords or OCR are accepted.
    const permissions=await pdf.getPermissions();
    if(permissions!==null)throw Object.assign(new Error('locked'),{code:'encrypted'});
    if(pdf.numPages>workerData.maxPages)throw Object.assign(new Error('pages'),{code:'pages'});
    const pages=[];let chars=0;
    for(let number=1;number<=pdf.numPages;number++){
      const page=await pdf.getPage(number);
      const content=await page.getTextContent({disableNormalization:true});
      let text='';
      for(const item of content.items){
        if(typeof item.str!=='string')continue;
        text+=item.str+(item.hasEOL?'\n':' ');
        if(text.length+chars>workerData.maxChars)throw Object.assign(new Error('text'),{code:'text'});
      }
      text=text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
      chars+=text.length;pages.push({page:number,text});page.cleanup();
    }
    if(!pages.some(p=>/[\p{L}\p{N}]/u.test(p.text)&&p.text.length>=12))throw Object.assign(new Error('no text'),{code:'image_only'});
    parentPort.postMessage({pages,totalPages:pdf.numPages});
  }catch(error){parentPort.postMessage({error:error.name==='PasswordException'?'encrypted':error.code||'invalid'});}
  finally{await pdf?.destroy();}
})();`;
const errors:Record<string,string>={encrypted:"This PDF is locked or encrypted. Upload an unlocked, permitted copy.",pages:`Use a PDF passage of ${MAX_PDF_PAGES} pages or fewer.`,text:"This PDF has too much text. Choose a shorter passage.",image_only:"This PDF has no usable selectable text. Scanned pages need OCR before uploading; DarsLoop does not perform OCR.",timeout:"This PDF could not be read within the safe limit. Try a smaller, simpler PDF.",invalid:"This PDF is damaged or unsupported. Export a fresh PDF with selectable text and try again."};
export async function extractPdf(bytes:Buffer,version=1):Promise<{pages:PdfPage[];totalPages:number}> {
  if(!bytes.length||bytes.length>MAX_PDF_BYTES)throw new PdfError("size","Choose a PDF of 8 MB or smaller.");
  if(bytes.subarray(0,5).toString()!=="%PDF-"||!bytes.subarray(Math.max(0,bytes.length-1024)).includes(Buffer.from("%%EOF")))throw new PdfError("signature",errors.invalid);
  // Resolve inside the native worker. Bundlers rewrite require.resolve externals.
  const packageFile=path.join(process.cwd(),"package.json");
  const result=await new Promise<{pages:{page:number;text:string}[];totalPages:number}>((resolve,reject)=>{
    const worker=new Worker(workerSource,{eval:true,workerData:{bytes,packageFile,maxPages:MAX_PDF_PAGES,maxChars:MAX_PDF_CHARACTERS},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16}});
    const timeout=setTimeout(()=>finish(new PdfError("timeout",errors.timeout)),15_000);let complete=false;
    function finish(error?:Error,value?:{pages:{page:number;text:string}[];totalPages:number}) {if(complete)return;complete=true;clearTimeout(timeout);void worker.terminate();if(error)reject(error);else resolve(value!);}
    worker.once("message",message=>message.error?finish(new PdfError(message.error,errors[message.error]||errors.invalid)):finish(undefined,message));
    worker.once("error",()=>finish(new PdfError("invalid",errors.invalid)));
    worker.once("exit",()=>{if(!complete)finish(new PdfError("invalid",errors.invalid));});
  });
  return {totalPages:result.totalPages,pages:result.pages.map(page=>({id:`v${version}-p${page.page}`,page:page.page,text:page.text,flags:!page.text?["No selectable text on this page"]:instructionLike(page.text)?["Instruction-like wording: excluded from AI study material; check the PDF"]:[]}))};
}
