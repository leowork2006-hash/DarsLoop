import { describe, expect, it } from "vitest";
import { exampleLesson } from "../src/lib/example";
import { detailedOptions, MATERIAL_GENERATION_REVISION } from "../src/lib/material-sections";
import { detailedQueueChange } from "../src/lib/material-queue";
import type { Lesson } from "../src/lib/types";

function lesson(): Lesson {
  const value=structuredClone(exampleLesson());
  return {...value,demo:false,shared:false,ownerId:"authored-owner",noteOptions:{enabled:true,detail:"standard",language:"auto"},segments:[{id:"authored-urdu",start:0,end:10,text:"استاد نے کہا کہ سبق کو سمجھ کر اپنے الفاظ میں دہرائیں۔",flags:[]}],artifacts:{...value.artifacts!,language:undefined},status:"ready"};
}
describe("detail and notes language remain independent",()=>{
  it("keeps saved English notes when Auto encounters an Urdu transcript, including older notes without language metadata",()=>{
    const value=lesson();
    expect(detailedOptions(value).language).toBe("en");
    const change=detailedQueueChange(value,value.ownerId,value.version,0,undefined);
    expect(change.lesson?.materialPreparation?.noteOptions.language).toBe("en");
    expect(change.lesson?.segments).toEqual(value.segments);expect(change.lesson?.artifacts).toEqual(value.artifacts);
  });
  it("honors an explicit language selection and rejects a competing language while the first operation is active",()=>{
    const value=lesson(),change=detailedQueueChange(value,value.ownerId,value.version,0,undefined,"ur");
    expect(change.lesson?.materialPreparation?.noteOptions.language).toBe("ur");
    expect(detailedQueueChange(change.lesson!,value.ownerId,value.version,0,"queued","ur").result.status).toBe("already_queued");
    expect(()=>detailedQueueChange(change.lesson!,value.ownerId,value.version,0,"queued","en")).toThrowError(expect.objectContaining({code:"busy"}));
  });
  it("does not queue another same-language prepared set; changing language requires a separate explicit request",()=>{
    const value=lesson();value.materialRevision=1;value.noteOptions={enabled:true,detail:"detailed",language:"en"};value.artifacts!.language="en";
    value.artifacts!.preparation={revision:MATERIAL_GENERATION_REVISION,detail:"detailed",totalSections:1,coveredSections:[1],uncoveredSections:[]};
    expect(detailedQueueChange(value,value.ownerId,value.version,1,"done","en")).toEqual({result:{status:"already_prepared",revision:1}});
    const changed=detailedQueueChange(value,value.ownerId,value.version,1,"done","ur");
    expect(changed.result.status).toBe("queued");expect(changed.lesson?.materialPreparation?.revision).toBe(2);expect(changed.lesson?.artifacts).toEqual(value.artifacts);
  });
});
