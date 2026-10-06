import { afterEach, expect, it, vi } from "vitest";
const api=vi.hoisted(()=>vi.fn());
vi.mock("../src/components/client-api",()=>({api}));
import { uploadLesson } from "../src/components/import-client";
afterEach(()=>{api.mockReset();vi.unstubAllGlobals();vi.useRealTimers();});
it("keeps language on local multipart and cloud options, and uses a parser hint for PDF",async()=>{
  api.mockResolvedValueOnce({mode:"local"}).mockResolvedValueOnce({id:"saved"});const file=new File(["fictional"],"study.pdf",{type:"application/pdf"});
  await uploadLesson(file,{title:"Study",course:"Test",permitted:true,synthetic:true,spokenLanguage:"en",noteOptions:{enabled:false,detail:"short",language:"ur"}},new AbortController().signal);
  const start=JSON.parse(api.mock.calls[0][1].body),form=api.mock.calls[1][1].body as FormData;
  expect(start.sourceKind).toBe("pdf");expect(start.noteOptions.language).toBe("ur");expect(form.get("studyLanguage")).toBe("ur");expect(form.get("spokenLanguage")).toBe("en");expect(form.get("sourceKind")).toBe("pdf");expect(form.get("notesEnabled")).toBe("false");
});

it("recovers a saved part after its successful upload acknowledgement is lost",async()=>{
  vi.useFakeTimers();
  const uploaded:string[]=[];
  class UploadRequest{
    status=0;timeout=0;upload={onprogress:null};onerror:(()=>void)|null=null;ontimeout:(()=>void)|null=null;onabort:(()=>void)|null=null;onload:(()=>void)|null=null;
    open(_method:string,url:string){uploaded.push(url);}setRequestHeader(){}abort(){this.onabort?.();}
    send(){queueMicrotask(()=>this.onerror?.());}
  }
  vi.stubGlobal("XMLHttpRequest",UploadRequest);
  api.mockResolvedValueOnce({mode:"cloud",id:"existing-import",parts:1})
    .mockResolvedValueOnce({parts:[{index:0,complete:false,url:"https://private-storage.invalid/part"}]})
    .mockResolvedValueOnce({parts:[{index:0,complete:true,url:null}]})
    .mockResolvedValueOnce({id:"saved-lesson"});
  const file=new File(["fictional"],"study.mp3",{type:"audio/mpeg"});
  const pending=uploadLesson(file,{title:"Study",course:"Test",permitted:true,synthetic:true,noteOptions:{enabled:true,detail:"short"}},new AbortController().signal);
  const checked=expect(pending).resolves.toEqual({id:"saved-lesson"});
  await vi.runAllTimersAsync();await checked;
  expect(uploaded).toHaveLength(1);
  expect(api.mock.calls.map(call=>JSON.parse(call[1].body).action)).toEqual(["start","parts","parts","finish"]);
});

it("refreshes an expired signed upload URL before retrying an unsaved part",async()=>{
  vi.useFakeTimers();
  const uploaded:string[]=[];
  class UploadRequest{
    status=0;timeout=0;upload={onprogress:null};onerror:(()=>void)|null=null;ontimeout:(()=>void)|null=null;onabort:(()=>void)|null=null;onload:(()=>void)|null=null;
    open(_method:string,url:string){uploaded.push(url);}setRequestHeader(){}abort(){this.onabort?.();}
    send(){this.status=uploaded.length===1?403:200;queueMicrotask(()=>this.onload?.());}
  }
  vi.stubGlobal("XMLHttpRequest",UploadRequest);
  api.mockResolvedValueOnce({mode:"cloud",id:"existing-import",parts:1})
    .mockResolvedValueOnce({parts:[{index:0,complete:false,url:"https://private-storage.invalid/expired"}]})
    .mockResolvedValueOnce({parts:[{index:0,complete:false,url:"https://private-storage.invalid/fresh"}]})
    .mockResolvedValueOnce({id:"saved-lesson"});
  const file=new File(["fictional"],"study.mp3",{type:"audio/mpeg"});
  const pending=uploadLesson(file,{title:"Study",course:"Test",permitted:true,synthetic:true,noteOptions:{enabled:true,detail:"short"}},new AbortController().signal);
  const checked=expect(pending).resolves.toEqual({id:"saved-lesson"});
  await vi.runAllTimersAsync();await checked;
  expect(uploaded).toEqual(["https://private-storage.invalid/expired","https://private-storage.invalid/fresh"]);
});

it("bounds failed part retries and resumes the same import without starting a duplicate",async()=>{
  vi.useFakeTimers();let sends=0,resume=false;
  class UploadRequest{
    status=0;timeout=0;upload={onprogress:null};onerror:(()=>void)|null=null;ontimeout:(()=>void)|null=null;onabort:(()=>void)|null=null;onload:(()=>void)|null=null;
    open(){}setRequestHeader(){}abort(){this.onabort?.();}send(){sends++;queueMicrotask(()=>this.onerror?.());}
  }
  vi.stubGlobal("XMLHttpRequest",UploadRequest);
  api.mockImplementation(async(_url,options)=>{
    const command=JSON.parse(options.body);
    if(command.action==="start")return {mode:"cloud",id:"same-import",parts:1};
    if(command.action==="parts")return {parts:[{index:0,complete:resume,url:resume?null:"https://private-storage.invalid/part"}]};
    return {id:"saved-lesson"};
  });
  const file=new File(["fictional"],"study.mp3",{type:"audio/mpeg"}),options={title:"Study",course:"Test",permitted:true,synthetic:true,noteOptions:{enabled:true,detail:"short" as const}};
  const pending=uploadLesson(file,options,new AbortController().signal);
  const outcome=pending.then(()=>"unexpected success",error=>String(error.message));
  await vi.runAllTimersAsync();expect(await outcome).toContain("connection dropped");expect(sends).toBe(3);
  expect(api.mock.calls.some(call=>JSON.parse(call[1].body).action==="finish")).toBe(false);
  resume=true;await expect(uploadLesson(file,options,new AbortController().signal)).resolves.toEqual({id:"saved-lesson"});
  expect(api.mock.calls.filter(call=>JSON.parse(call[1].body).action==="start")).toHaveLength(1);expect(sends).toBe(3);
});

it("does not retry or query storage after an intentional upload cancellation",async()=>{
  const controller=new AbortController();
  class UploadRequest{
    status=0;timeout=0;upload={onprogress:null};onerror:(()=>void)|null=null;ontimeout:(()=>void)|null=null;onabort:(()=>void)|null=null;onload:(()=>void)|null=null;
    open(){}setRequestHeader(){}abort(){this.onabort?.();}send(){queueMicrotask(()=>controller.abort());}
  }
  vi.stubGlobal("XMLHttpRequest",UploadRequest);
  api.mockResolvedValueOnce({mode:"cloud",id:"cancelled-import",parts:1}).mockResolvedValueOnce({parts:[{index:0,complete:false,url:"https://private-storage.invalid/part"}]});
  const file=new File(["fictional"],"study.mp3",{type:"audio/mpeg"});
  await expect(uploadLesson(file,{title:"Study",course:"Test",permitted:true,synthetic:true,noteOptions:{enabled:true,detail:"short"}},controller.signal)).rejects.toMatchObject({name:"AbortError"});
  expect(api).toHaveBeenCalledTimes(2);
});
