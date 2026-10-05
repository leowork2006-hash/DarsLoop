import { afterEach, expect, it, vi } from "vitest";
const api=vi.hoisted(()=>vi.fn());
vi.mock("../src/components/client-api",()=>({api}));
import { uploadLesson } from "../src/components/import-client";
afterEach(()=>api.mockReset());
it("keeps language on local multipart and cloud options, and uses a parser hint for PDF",async()=>{
  api.mockResolvedValueOnce({mode:"local"}).mockResolvedValueOnce({id:"saved"});const file=new File(["fictional"],"study.pdf",{type:"application/pdf"});
  await uploadLesson(file,{title:"Study",course:"Test",permitted:true,synthetic:true,spokenLanguage:"en",noteOptions:{enabled:false,detail:"short",language:"ur"}},new AbortController().signal);
  const start=JSON.parse(api.mock.calls[0][1].body),form=api.mock.calls[1][1].body as FormData;
  expect(start.sourceKind).toBe("pdf");expect(start.noteOptions.language).toBe("ur");expect(form.get("studyLanguage")).toBe("ur");expect(form.get("spokenLanguage")).toBe("en");expect(form.get("sourceKind")).toBe("pdf");expect(form.get("notesEnabled")).toBe("false");
});
