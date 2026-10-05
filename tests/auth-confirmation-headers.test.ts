import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { NodeNextRequest, NodeNextResponse } from "next/dist/server/base-http/node";
import { sendResponse } from "next/dist/server/send-response";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import config from "../next.config";
import { HEAD } from "../src/app/auth/confirm/route";

async function configuredResponse(path: string, response: Response) {
  const request = new IncomingMessage(new Socket());
  request.method = "HEAD";
  request.url = path;
  const outgoing = new NodeNextResponse(new ServerResponse(request));
  for (const rule of await config.headers!()) {
    if (getPathMatch(rule.source)(path)) {
      for (const header of rule.headers) outgoing.setHeader(header.key, header.value);
    }
  }
  // Exercise Next's real response writer: a configured header takes precedence
  // over the same header returned by the Route Handler.
  await sendResponse(new NodeNextRequest(request), outgoing, response);
  return outgoing;
}

describe("confirmation privacy through Next configured headers", () => {
  it("retains no-referrer and private/no-store through the actual Next response writer", async () => {
    for (const path of ["/auth/confirm", "/auth/confirm/"]) {
      const response = await configuredResponse(path, await HEAD());
      expect(response.getHeader("referrer-policy")).toBe("no-referrer");
      expect(response.getHeader("cache-control")).toBe("private, no-store, max-age=0");
      expect(response.getHeader("pragma")).toBe("no-cache");
      expect(response.getHeader("expires")).toBe("0");
      expect(response.getHeader("x-content-type-options")).toBe("nosniff");
      expect(response.getHeader("x-frame-options")).toBe("DENY");
    }
  });

  it("retains the existing global referrer policy outside the confirmation route", async () => {
    for (const path of ["/signin", "/auth/callback", "/auth/confirm-other"]) {
      const response = await configuredResponse(path, new Response(null));
      expect(response.getHeader("referrer-policy")).toBe("same-origin");
      expect(response.getHeader("cache-control")).toBeUndefined();
    }
  });
});
