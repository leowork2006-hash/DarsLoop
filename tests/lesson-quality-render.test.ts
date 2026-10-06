import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AudioTranscript, LessonView } from "../src/components/lesson-view";
import { exampleLesson } from "../src/lib/example";

describe("compact source checks preserve uncertainty and source language",()=>{
  it("keeps original words and replay available, with closed details in source Urdu even when notes are English",()=>{
    const lesson=exampleLesson();lesson.demo=false;
    lesson.artifacts!.language="en";
    lesson.segments=[{id:"source",start:8,end:12,text:"یہ سبق ہے اور ہم اس کو دوبارہ سنیں گے۔",flags:["Wording differs between two transcriptions. Replay this moment."]}];
    const before=JSON.stringify(lesson);
    const html=renderToStaticMarkup(createElement(AudioTranscript,{lesson,onPlay:()=>{}}));
    expect(html).toContain(lesson.segments[0].text);
    expect(html).toContain('aria-label="Play transcript at 0:08"');
    expect(html).toContain("الفاظ چیک کریں");
    expect(html).toContain("دو نقلوں کے الفاظ مختلف ہیں");
    expect(html).not.toContain("Wording differs between");
    expect(html).toMatch(/<details[^>]*><summary>/);
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(JSON.stringify(lesson)).toBe(before);
  });
  it("discloses unavailable practice without expanding the whole warning by default",()=>{
    const lesson=exampleLesson();lesson.demo=false;lesson.artifacts!.practice=[];
    lesson.artifacts!.warnings=["Supported questions could not be prepared."];
    const noop=()=>{};
    const html=renderToStaticMarkup(createElement(LessonView,{lesson,tab:"transcript",setTab:noop,onBack:noop,onPlay:noop,onError:noop,onShare:noop,onDelete:noop,onReviewed:noop,configured:false,focusItemId:null,preview:false}));
    expect(html).toContain("Some study material isn’t ready.");
    expect(html).toContain("Details and next step");
    expect(html).toContain("Supported questions could not be prepared.");
    expect(html).toContain("Open transcript");
    expect(html).not.toContain('class="processing-banner"');
  });
});
