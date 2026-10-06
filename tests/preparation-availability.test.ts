import { describe, expect, it } from "vitest";
import { preparationNotice } from "../src/lib/preparation-availability";

describe("upfront upload preparation availability", () => {
  it("requires generation for each source while letting permitted files be saved", () => {
    for (const asr of [false, true]) {
      const configured = { asr, generation: false };
      for (const source of ["any", "audio", "pdf"] as const) {
        const notice = preparationNotice(configured, source)!;
        expect(notice.title).toContain("Study-material preparation");
        expect(notice.description).toContain("save");
        expect(notice.description).toContain("will wait");
      }
      expect(preparationNotice(configured, "pdf")!.description).not.toContain("transcript");
    }
  });
  it("warns about unavailable transcription without blocking generation-ready PDF preparation", () => {
    const configured = { asr: false, generation: true };
    expect(preparationNotice(configured, "pdf")).toBeNull();
    expect(preparationNotice(configured, "audio")?.title).toContain("transcription");
    expect(preparationNotice(configured)?.description).toContain("Selectable-text PDFs can still be prepared");
    expect(preparationNotice(configured, "audio")?.description).toContain("save this permitted recording");
  });
  it("does not show a setup notice when both required services are configured", () => {
    for (const source of ["any", "audio", "pdf"] as const) expect(preparationNotice({ asr: true, generation: true }, source)).toBeNull();
  });
});
