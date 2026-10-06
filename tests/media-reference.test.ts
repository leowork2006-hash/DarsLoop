import { describe, expect, it } from "vitest";
import { inspectAudio, mediaMime, parseRange } from "../src/lib/media";
import { isCategoryOnly, mapRecord, parseRpc } from "../src/lib/references";
describe("recording and playback",()=>{
  it("checks actual bundled fictional audio",async()=>{expect(await inspectAudio("fixtures/demo.mp3")).toBeGreaterThan(90);});
  it("rejects files disguised by extensions",()=>{expect(mediaMime(Buffer.from("not audio.mp3"))).toBeNull();expect(mediaMime(Buffer.from("ID3audio"))).toBe("audio/mpeg");});
  it("supports bounded and suffix playback and rejects invalid ranges",()=>{
    expect(parseRange("bytes=0-99",1000)).toEqual({start:0,end:99});
    expect(parseRange("bytes=-20",1000)).toEqual({start:980,end:999});
    expect(parseRange("bytes=900-2000",1000)).toEqual({start:900,end:999});
    for(const value of ["bytes=1000-","bytes=10-5","bytes=-0","bytes=0-1,5-6","bytes=-"])expect(()=>parseRange(value,1000)).toThrow();
  });
});
describe("separate source suggestions",()=>{
  const query="إنما الأعمال بالنيات وإنما لكل امرئ ما نوى";
  const record={id:"hadith:4560:ar",title:"الأعمال بالنيات",url:"https://hadeethenc.com/ar/browse/hadith/4560",segments:[{kind:"exact",text:query},{kind:"commentary",text:"Never substitute commentary for narration"}],metadata:{source:"HadeethEnc",language:"ar",grade:"صحيح",attribution:"متفق عليه"}};
  it("preserves source wording and attributed grade without inventing collection numbers",()=>{
    const candidate=mapRecord(record,query)!;expect(candidate.text).toBe(query);expect(candidate.gradePublisher).toBe("HadeethEnc");expect(candidate.collectionAttribution).toBe("متفق عليه");expect(candidate.recordHash).toHaveLength(64);
  });
  it("rejects missing grade, unrelated text and unapproved URLs",()=>{
    expect(mapRecord({...record,metadata:{...record.metadata,grade:undefined}},query)).toBeNull();
    expect(mapRecord(record,"three completely unrelated tokens")).toBeNull();
    expect(mapRecord({...record,url:"https://hadeethenc.com.evil.invalid/ar/browse/hadith/4560"},query)).toBeNull();
  });
  it("does not mistake shared Urdu connecting words for the requested narration",()=>{
    const wording="اعمال کا دار و مدار نیتوں پر ہے";
    const urdu={...record,id:"hadith:4560:ur",url:"https://hadeethenc.com/ur/browse/hadith/4560",metadata:{...record.metadata,language:"ur"}};
    expect(mapRecord({...urdu,segments:[{kind:"exact",text:wording}]},wording)).not.toBeNull();
    // Authored negative fixture: shares connecting words, not the intention term.
    expect(mapRecord({...urdu,segments:[{kind:"exact",text:"اس کا دار و مدار اعمال پر ہے"}]},wording)).toBeNull();
    expect(mapRecord({...urdu,segments:[{kind:"exact",text:"اس کی بات پر ہے"}]},"اس کی بات پر ہے")).toBeNull();
  });
  it("filters topic-only hits without contaminating adjacent wording hits",()=>{
    const text="1. [in category: Learning] A\nhttps://example.org/1\n2. [wording] B\nhttps://example.org/2\n";
    expect(isCategoryOnly({url:"https://example.org/1"},text)).toBe(true);
    expect(isCategoryOnly({url:"https://example.org/2"},text)).toBe(false);
    expect(isCategoryOnly({url:"missing"},text)).toBe(true);
  });
  it("accepts matching JSON/SSE ids and rejects upstream errors",()=>{
    expect(parseRpc('event: message\ndata: {"id":2,"result":{"ok":true}}\n\n',2)).toEqual({ok:true});
    expect(()=>parseRpc('{"id":2,"error":{"message":"Unavailable"}}',2)).toThrow();
    expect(()=>parseRpc('{"id":1,"result":{}}',2)).toThrow();
  });
});
