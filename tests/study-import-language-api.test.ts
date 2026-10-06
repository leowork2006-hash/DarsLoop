import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
const f=vi.hoisted(()=>({cloud:true,user:"student",dir:`/private/tmp/darsloop-language-api-${Date.now()}`,create:vi.fn(),form:vi.fn(),media:vi.fn(),pdf:vi.fn(),queue:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"fictional-session"})})}));
vi.mock("../src/lib/store",()=>({sessionUser:()=>f.user}));
vi.mock("../src/lib/supabase/config",()=>({cloudMode:()=>f.cloud}));
vi.mock("../src/lib/supabase/server",()=>({accountUser:async()=>f.user?{id:f.user}:null,AccountServiceUnavailable:class extends Error{}}));
vi.mock("../src/lib/backend",()=>({dataDir:f.dir,countLessons:async()=>0,takeBudget:async()=>true,rawLesson:async()=>null,queueLesson:(...a:unknown[])=>f.queue(...a),publicLesson:(value:unknown)=>value,storeAudio:vi.fn(),removeCloudAudio:vi.fn()}));
vi.mock("../src/lib/supabase/imports",()=>({createImport:(...a:unknown[])=>f.create(...a),signImportParts:vi.fn(),completedImport:vi.fn(),ImportFailure:class extends Error{}}));
vi.mock("../src/lib/import-form",()=>({readImportForm:()=>f.form(),ImportError:class extends Error{}}));
vi.mock("../src/lib/media",()=>({prepareImportedAudio:(...a:unknown[])=>f.media(...a),MediaError:class extends Error{constructor(public code:string,message:string){super(message);}}}));
vi.mock("../src/lib/pdf-lessons",()=>({createPdfLesson:(...a:unknown[])=>f.pdf(...a)}));
vi.mock("../src/lib/ai",()=>({configured:()=>({asr:false,generation:false})}));
const imports=await import("../src/app/api/imports/route"),lessons=await import("../src/app/api/lessons/route");
const {MediaError}=await import("../src/lib/media");
const {PdfError}=await import("../src/lib/pdf-options");
const request=(input:unknown,path="imports",headers:Record<string,string>={})=>new Request(`http://localhost:3000/api/${path}`,{method:"POST",headers:{host:"localhost:3000",origin:"http://localhost:3000",...headers},body:JSON.stringify(input)});
const base={action:"start",bytes:100,title:"Fictional lesson",course:"Review",permitted:true,synthetic:true,spokenLanguage:"en",noteOptions:{enabled:true,detail:"standard"}};
beforeEach(()=>{vi.stubEnv("DARSLOOP_ORIGIN","http://localhost:3000");f.cloud=true;f.user="student";f.create.mockReset().mockResolvedValue({id:"saved-import",parts:1});f.media.mockReset();f.pdf.mockReset().mockResolvedValue({id:"saved-pdf"});f.queue.mockReset();f.form.mockReset().mockImplementation(()=>{const form=new FormData();for(const [key,value] of Object.entries({title:"Fictional lesson",course:"Review",permitted:"true",synthetic:"true",studyLanguage:"ur",sourceKind:"audio"}))form.set(key,value);return form;});});
afterAll(async()=>{await rm(f.dir,{force:true,recursive:true});vi.unstubAllEnvs();});
describe("language and source options HTTP contract with mocked private storage",()=>{
  it("retains both explicit permission and eligible-data attestations before cloud import creation",async()=>{
    for(const key of ["permitted","synthetic"] as const)for(const value of [false,undefined,"true"]){
      const response=await imports.POST(request({...base,[key]:value}));
      expect(response.status).toBe(400);
    }
    expect(f.create).not.toHaveBeenCalled();expect(f.queue).not.toHaveBeenCalled();
    const response=await imports.POST(request({...base,title:"Anonymised lesson material"}));
    expect(response.status).toBe(200);
    expect(f.create).toHaveBeenCalledTimes(1);
    const stored=f.create.mock.calls[0][1];
    expect(stored.title).toBe("Anonymised lesson material");
    expect(stored).not.toHaveProperty("synthetic");expect(stored).not.toHaveProperty("permitted");
  });
  it("retains both multipart gates and explains eligibility without classifying a real source as fictional",async()=>{
    f.cloud=false;
    const original:FormData=f.form();
    for(const key of ["permitted","synthetic"]){
      const incomplete=new FormData();original.forEach((value,name)=>incomplete.set(name,value));incomplete.delete(key);
      f.form.mockReturnValue(incomplete);
      const response=await lessons.POST(request({},"lessons"));
      expect(response.status).toBe(400);
      const result=await response.json();expect(result.error).toContain("synthetic or irreversibly anonymised");expect(result.error).not.toContain("fictional");
    }
    expect(f.media).not.toHaveBeenCalled();expect(f.pdf).not.toHaveBeenCalled();expect(f.queue).not.toHaveBeenCalled();
    original.set("title","Anonymised source");original.set("sourceKind","pdf");f.form.mockReturnValue(original);
    expect((await lessons.POST(request({},"lessons"))).status).toBe(201);
    expect(f.pdf.mock.calls[0][0]).toMatchObject({title:"Anonymised source",userId:"student"});
  });
  it("rejects malformed JSON payload shapes without opening private storage",async()=>{
    for(const input of [null,[],"start",true,7]){
      const response=await imports.POST(request(input));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(f.create).not.toHaveBeenCalled();expect(f.queue).not.toHaveBeenCalled();
  });
  it("persists validated language under authenticated ownership, with legacy Auto default",async()=>{
    for(const language of [undefined,"auto","ar","ur","en"]){const response=await imports.POST(request({...base,ownerId:"foreign",noteOptions:{...base.noteOptions,...(language?{language}:{})}}));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");const [owner,values]=f.create.mock.calls.at(-1)!;expect(owner).toBe("student");expect(values.noteOptions.language).toBe(language||"auto");expect(values.spokenLanguage).toBe("en");expect(values).not.toHaveProperty("ownerId");}
  });
  it("rejects wrong language, hidden note keys and oversized PDF before storage creation",async()=>{
    for(const input of [{...base,noteOptions:{...base.noteOptions,language:"fr"}},{...base,noteOptions:{...base.noteOptions,language:{prompt:"override"}}},{...base,noteOptions:{...base.noteOptions,privateOverride:true}},{...base,sourceKind:"pdf",bytes:8_000_001}])expect((await imports.POST(request(input))).status).toBe(400);expect(f.create).not.toHaveBeenCalled();
    expect((await imports.POST(request({...base,sourceKind:"pdf",bytes:8_000_000,noteOptions:{...base.noteOptions,language:"ar"}}))).status).toBe(200);
    expect(f.create.mock.calls[0][1]).toMatchObject({sourceKind:"pdf",noteOptions:{language:"ar"}});
  });
  it("denies signed-out and cross-site import settings before storage mutation",async()=>{
    expect((await imports.POST(request(base,"imports",{origin:"https://foreign.invalid"}))).status).toBe(403);f.user="";expect((await imports.POST(request(base))).status).toBe(401);expect(f.create).not.toHaveBeenCalled();
  });
  it("retains an actionable duration error instead of masking it as a format error",async()=>{
    f.cloud=false;f.media.mockRejectedValue(new MediaError("media_duration","Choose a valid recording of up to two hours."));const response=await lessons.POST(request({},"lessons"));expect(response.status).toBe(400);expect((await response.json()).error).toContain("up to two hours");expect(f.pdf).not.toHaveBeenCalled();
  });
  it("propagates PDF language and verified user identity without invoking the audio parser",async()=>{
    f.cloud=false;const form=f.form();form.set("sourceKind","pdf");f.form.mockReturnValue(form);const response=await lessons.POST(request({},"lessons"));expect(response.status).toBe(201);expect(f.pdf.mock.calls[0][0]).toMatchObject({userId:"student",noteOptions:{language:"ur"}});expect(f.media).not.toHaveBeenCalled();
    f.pdf.mockRejectedValueOnce(new PdfError("scan","This PDF has no selectable text. Choose a text PDF."));const rejected=await lessons.POST(request({},"lessons"));expect(rejected.status).toBe(400);expect((await rejected.json()).error).toContain("no selectable text");
  });
});
