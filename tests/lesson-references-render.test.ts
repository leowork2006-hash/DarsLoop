import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonView } from "../src/components/lesson-view";
import { demoReferences } from "../src/lib/demo-references";
import { exampleLesson } from "../src/lib/example";
import type { Lesson } from "../src/lib/types";

function renderReferences(lesson: Lesson,preview=true) {
  const noop=()=>{};
  return renderToStaticMarkup(createElement(LessonView, {
    lesson, tab: "sources", setTab: noop, onBack: noop, onPlay: noop,
    onError: noop, onShare: noop, onDelete: noop, onReviewed: noop,
    configured: false, focusItemId: null, preview,
  }));
}

describe("References rendering and the authored-demo boundary",()=>{
  it("keeps both canonical bibliography links separate from the lookup explanation",()=>{
    const html=renderReferences(exampleLesson());
    for(const source of demoReferences) {
      expect(html).toContain(`href="${source.url}"`);
      expect(html).toContain(`aria-label="${source.label}"`);
    }
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain("background references, not scholarly approval");
    expect(html).toMatch(/<\/ul>[\s\S]*<\/section><section[^>]*aria-labelledby=/);
    expect(html).toContain("This example has no hadith quotation to look up.");
    expect(html).not.toContain("Find possible sources</button>");
  });

  it("never assigns the demo bibliography to a personal or changed lesson with the same title",()=>{
    const personal={...exampleLesson(),demo:false};
    const changed=exampleLesson();
    changed.segments=changed.segments.map((segment,index)=>index===0?{...segment,text:"A different authored lesson passage."}:segment);
    for(const lesson of [personal,changed]) {
      const html=renderReferences(lesson,false);
      for(const source of demoReferences) expect(html).not.toContain(`href="${source.url}"`);
      expect(html).toContain("Possible hadith sources.");
      expect(html).toContain("Words to look up");
      expect(html).toContain("Only these captured words are sent to the public reference provider.");
    }
    const changedPreview=renderReferences(changed);
    expect(changedPreview).toContain("A source needs actual wording.");
    for(const source of demoReferences) expect(changedPreview).not.toContain(`href="${source.url}"`);
  });
});
