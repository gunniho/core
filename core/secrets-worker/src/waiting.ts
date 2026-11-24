// waiting.ts — WHAT WAITS FOR A MEMBER NOW, WITH NO TEXT (iterate/acts `Waiting`): the acts the
// gate holds, the rules it was asked for, and the requests each secret holds, as one short row
// each. It is what `/secrets/approvals` shows first, for a reader that only says that something
// waits and how much: a lock screen, a badge, a count. A reader that shows one act for a decision
// takes its exact text from `heldActs` and hashes it itself.
import { actOfText, type Waiting } from "iterate/acts";
import { isSecretRule, summaryOf, type GateState } from "./acts-gate.ts";
import type { HeldRequest } from "./approval.ts";
import type { HeldRow } from "./secret/durable-object.ts";

/** A held request as one line, its method and its host: the rest of its address may hold what the
 *  mind's code put there, and is in the text a member reads on the page. */
function requestSummary(text: string): string {
  try {
    const held = JSON.parse(text) as HeldRequest;
    return `${held.method} ${new URL(held.url).host}`;
  } catch {
    return "A request";
  }
}

/** The rows that wait at `now`: an approved one is past its decision, and one whose day ran out
 *  can no longer be decided. Each list has the one that waited longest first. */
export function waitingOf(
  input: {
    gate: Pick<GateState, "held" | "proposed">;
    secrets: { path: string; held: Pick<HeldRow, "digest" | "text" | "at" | "until" | "from" | "state">[] }[];
  },
  now: number,
): Waiting {
  const open = <Row extends { state: string; until: number }>(row: Row) =>
    row.state === "waiting" && row.until > now;
  return {
    acts: input.gate.held
      .filter(open)
      .map(({ digest, text, at, until, from }) => {
        const act = actOfText(text);
        return {
          digest,
          act: act?.act ?? "",
          summary: act ? summaryOf(act) : "An act",
          at,
          until,
          ...(from && { from }),
        };
      })
      .sort((a, b) => a.at - b.at),
    rules: input.gate.proposed
      .map(({ id, rule, at, from }) => ({
        id,
        at,
        ...(isSecretRule(rule) ? { secret: rule.secret } : { verb: rule.verb }),
        ...(from && { from }),
      }))
      .sort((a, b) => a.at - b.at),
    requests: input.secrets
      .flatMap(({ path, held }) =>
        held.filter(open).map(({ digest, text, at, until, from }) => ({
          digest,
          secret: path,
          summary: requestSummary(text),
          at,
          until,
          ...(from && { from }),
        })),
      )
      .sort((a, b) => a.at - b.at),
  };
}
