import { expect,it } from "vitest";
import { IMPORT_PART_BYTES,MAX_IMPORT_BYTES,importPartSize } from "../src/lib/upload-options";

it("covers the maximum import with storage requests below the free per-file cap",()=>{
  const count=Math.ceil(MAX_IMPORT_BYTES/IMPORT_PART_BYTES);
  const sizes=Array.from({length:count},(_,i)=>importPartSize(MAX_IMPORT_BYTES,i));
  expect(sizes.reduce((sum,n)=>sum+n,0)).toBe(MAX_IMPORT_BYTES);
  expect(Math.max(...sizes)).toBeLessThan(6_000_000);
  expect(importPartSize(IMPORT_PART_BYTES+17,1)).toBe(17);
});
it("rejects over-limit sizes and part indexes before constructing storage requests",()=>{
  for(const [bytes,index] of [[0,0],[MAX_IMPORT_BYTES+1,0],[100,-1],[100,1],[100,0.5],[NaN,0]])expect(()=>importPartSize(bytes,index)).toThrow();
});
