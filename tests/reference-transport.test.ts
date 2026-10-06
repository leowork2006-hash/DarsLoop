import { afterEach, describe, expect, it, vi } from "vitest";
import { findCandidates, mapRecord } from "../src/lib/references";

const query = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى";
const record = (id: string, number: number) => ({ id, title: "Authored provider fixture", url: `https://hadeethenc.com/ar/browse/hadith/${number}`, segments: [{ kind: "exact", text: query }, { kind: "commentary", text: "Commentary must remain separate." }], metadata: { source: "HadeethEnc", language: "ar", grade: "صحيح", attribution: "متفق عليه" } });
function response(id: number, result: unknown, format: "JSON" | "SSE") {
  const message = JSON.stringify({ jsonrpc: "2.0", id, result });
  return new Response(format === "JSON" ? message : `: keepalive\n\nevent: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress","params":{}}\n\nevent: message\ndata: ${message}\n\n`, { status: 200, headers: { "content-type": format === "JSON" ? "application/json" : "text/event-stream" } });
}
afterEach(() => vi.unstubAllGlobals());

describe("References JSON/SSE transport with a local fetch mock", () => {
  it.each(["JSON", "SSE"] as const)("completes initialize-search-fetch over %s, preserving exact source metadata and deduplicating hits", async format => {
    const first = record("hadith:4560:ar", 4560), second = record("hadith:2000:ar", 2000);
    const calls: { method: string; id: number; params: unknown }[] = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe("https://mcp.islamiccontent.org/mcp");
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("accept")).toBe("application/json, text/event-stream");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const rpc = JSON.parse(String(init?.body)); calls.push(rpc);
      if (rpc.method === "initialize") return response(rpc.id, { protocolVersion: "2025-03-26" }, format);
      // The current provider uses [hadith]; [wording] is also an explicit supported fixture marker.
      const marker = format === "JSON" ? "hadith" : "wording";
      if (rpc.params.name === "search") return response(rpc.id, { content: [{ type: "text", text: `1. [${marker}] First\n${query}\n${first.url}\n2. [${marker}] Variant\n${query}\n${second.url}\n` }], structuredContent: { results: [first, first, second].map(({ id, title, url }) => ({ id, title, url })) } }, format);
      expect(rpc.params.name).toBe("fetch");
      return response(rpc.id, { structuredContent: rpc.params.arguments.id === first.id ? first : second }, format);
    });
    vi.stubGlobal("fetch", fetchMock);
    const candidates = await findCandidates(query, "ar");
    expect(candidates.map(c => c.id)).toEqual([first.id, second.id]);
    expect(candidates.every(c => c.text === query && c.grade === "صحيح" && c.gradePublisher === "HadeethEnc" && c.matchBasis === "wording" && c.collectionAttribution === "متفق عليه" && c.recordHash.length === 64)).toBe(true);
    expect(candidates.every(c => !c.text.includes("Commentary"))).toBe(true);
    expect(calls.map(c => c.method)).toEqual(["initialize", "tools/call", "tools/call", "tools/call"]);
    expect(calls[1].params).toEqual({ name: "search", arguments: { query, sources: ["hadith"], language: "ar", limit: 5 } });
    expect(calls.slice(2).map(c => c.params)).toEqual([first, second].map(r => ({ name: "fetch", arguments: { id: r.id } })));
  });
  it("excludes topic-only and unrendered hits before fetch, and rejects incomplete/noncanonical fetched records", async () => {
    const good = record("hadith:4560:ar", 4560), topic = record("hadith:topic:ar", 10), absent = record("hadith:unmarked:ar", 20), missingGrade = record("hadith:missing-grade:ar", 30), badUrl = record("hadith:bad-url:ar", 40);
    const records = [good, topic, absent, missingGrade, badUrl];
    const fetched: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const rpc = JSON.parse(String(init.body));
      if (rpc.method === "initialize") return response(rpc.id, {}, "JSON");
      if (rpc.params.name === "search") return response(rpc.id, { content: [{ type: "text", text: `1. [wording] Good\n${good.url}\n2. [in category: Intentions] Topic\n${topic.url}\n3. [wording] Missing grade\n${missingGrade.url}\n4. [wording] Bad URL\n${badUrl.url}\n` }], structuredContent: { results: records.map(({ id, title, url }) => ({ id, title, url })) } }, "SSE");
      const id = rpc.params.arguments.id; fetched.push(id);
      const value = records.find(r => r.id === id)!;
      return response(rpc.id, { structuredContent: id === missingGrade.id ? { ...value, metadata: { ...value.metadata, grade: undefined } } : id === badUrl.id ? { ...value, url: "https://hadeethenc.com.evil.invalid/ar/browse/hadith/40" } : value }, "JSON");
    }));
    expect((await findCandidates(query, "ar")).map(c => c.id)).toEqual([good.id]);
    expect(fetched).toEqual([good.id, missingGrade.id, badUrl.id]);
  });
  it("does not fetch a rendered hit without an explicit wording-match marker", async () => {
    const unmarked = record("hadith:4560:ar", 4560);
    const fetchMock = vi.fn(async (_url, init) => {
      const rpc = JSON.parse(String(init.body));
      if (rpc.method === "initialize") return response(rpc.id, {}, "JSON");
      if (rpc.params.name === "search") return response(rpc.id, { content: [{ type: "text", text: `1. Unspecified search basis\n${unmarked.url}\n` }], structuredContent: { results: [{ id: unmarked.id, title: unmarked.title, url: unmarked.url }] } }, "SSE");
      return response(rpc.id, { structuredContent: unmarked }, "JSON");
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await findCandidates(query, "ar")).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("requires a canonical URL, matching record identity/language and a nonblank publisher grade", () => {
    const valid = record("hadith:4560:ar", 4560);
    expect(mapRecord(valid, query)?.id).toBe(valid.id);
    const invalid = [
      { ...valid, url: "https://hadeethenc.com:8443/ar/browse/hadith/4560" },
      { ...valid, url: `${valid.url}?alternate=1` },
      { ...valid, url: `${valid.url}#alternate` },
      { ...valid, url: "https://hadeethenc.com/ar/browse/hadith/2000" },
      { ...valid, url: "https://hadeethenc.com/en/browse/hadith/4560" },
      { ...valid, id: "hadith:4560:en" },
      { ...valid, id: "hadith:opaque" },
      { ...valid, metadata: { ...valid.metadata, language: "en" } },
      { ...valid, metadata: { ...valid.metadata, grade: "   " } },
    ];
    for (const value of invalid) expect(mapRecord(value, query), JSON.stringify({ id: value.id, url: value.url, metadata: value.metadata })).toBeNull();
  });
  it("returns no match only for a completed empty search; HTTP, RPC and malformed provider failures throw", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(1, {}, "JSON")).mockResolvedValueOnce(response(2, { content: [], structuredContent: { results: [] } }, "SSE"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await findCandidates(query, "ar")).toEqual([]);
    for (const failed of [new Response("outage", { status: 503 }), new Response('{"id":1,"error":{"message":"upstream"}}'), new Response("invalid event payload")]) {
      fetchMock.mockReset().mockResolvedValue(failed);
      await expect(findCandidates(query, "ar")).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
});
