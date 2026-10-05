/** Tiny authored PDF fixture; no copyrighted book or learner records. */
export function authoredPdf(options:{pages?:number;blank?:boolean;encrypted?:boolean;arabic?:boolean}={}) {
  const count=options.pages??(options.arabic?2:1),objects:string[]=[];
  const arabic="المراجعة تساعد على تذكر الدرس";
  const hex=(text:string)=>[...text].map(c=>c.charCodeAt(0).toString(16).padStart(4,"0")).join("");
  const pageIds=Array.from({length:count},(_,i)=>7+i*2);
  objects.push("<< /Type /Catalog /Pages 2 0 R >>",`<< /Type /Pages /Kids [${pageIds.map(n=>`${n} 0 R`).join(" ")}] /Count ${count} >>`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const cmap=`/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Authored def /CMapType 2 def 1 begincodespacerange <0000> <ffff> endcodespacerange ${new Set(arabic).size} beginbfchar ${[...new Set(arabic)].map(c=>`<${hex(c)}> <${hex(c)}>`).join("\n")} endbfchar endcmap CMapName currentdict /CMap defineresource pop end end`;
  objects.push("<< /Type /Font /Subtype /Type0 /BaseFont /AuthoredArabic /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 6 0 R >>","<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AuthoredArabic /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 600 >>",`<< /Length ${Buffer.byteLength(cmap)} >>\nstream\n${cmap}\nendstream`);
  for(let i=0;i<count;i++){
    const content=options.blank?"":options.arabic&&i===1?`BT /F2 18 Tf 72 700 Td <${hex(arabic.split(" ").map(word=>[...word].reverse().join("")).join(" "))}> Tj ET`:"BT /F1 14 Tf 72 700 Td (Leaves receive sunlight and roots absorb water.) Tj 0 -24 Td (Review a short source passage on another day.) Tj ET";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i]+1} 0 R >>`,`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  const offsets=[0];let pdf="%PDF-1.7\n";objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R ${options.encrypted?`/Encrypt << /Filter /Standard /V 1 /R 2 /O <${'00'.repeat(32)}> /U <${'00'.repeat(32)}> /P -4 >> /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>]`:''}>>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(pdf);
}
