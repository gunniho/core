import { expect, test } from "vitest";
import { waitingOf } from "./waiting.ts";

const MAIL = JSON.stringify({
  act: "email.send",
  from: "agent@example.com",
  fromName: "The agent",
  replyTo: null,
  to: ["jo@example.net"],
  cc: [],
  subject: "Hi",
  text: "Hello.",
  html: null,
  inReplyTo: null,
  references: null,
  attachments: [],
});
const CALL = JSON.stringify({ act: "itx.whatsapp.sendMessage", args: ["jo", { text: "hi" }] });
const REQUEST = JSON.stringify({
  method: "POST",
  url: "https://api.example.com/v1/pay?to=jo",
  headers: [],
  body: '{"amount":5}',
});
const digest = (letter: string) => letter.repeat(64);

test("what waits is each act, proposed rule and held request as one row, and never its text", () => {
  const waiting = waitingOf(
    {
      gate: {
        held: [
          { digest: digest("b"), text: CALL, at: 20, until: 900, state: "waiting", waited: true },
          {
            digest: digest("a"),
            text: MAIL,
            at: 10,
            until: 900,
            from: "/agents/mail",
            state: "waiting",
            waited: false,
          },
        ],
        proposed: [
          { id: "p2", rule: { verb: "itx.whatsapp.*" }, at: 40 },
          {
            id: "p1",
            rule: { secret: "/secrets/pay", methods: ["POST"], hosts: ["api.example.com"] },
            at: 30,
            from: "/agents/pay",
          },
        ],
      },
      secrets: [
        {
          path: "/secrets/pay",
          held: [{ digest: digest("c"), text: REQUEST, at: 50, until: 900, state: "waiting" }],
        },
      ],
    },
    100,
  );
  expect(waiting).toEqual({
    acts: [
      {
        digest: digest("a"),
        act: "email.send",
        summary: "Mail to jo@example.net: Hi",
        at: 10,
        until: 900,
        from: "/agents/mail",
      },
      {
        digest: digest("b"),
        act: "itx.whatsapp.sendMessage",
        summary: "itx.whatsapp.sendMessage",
        at: 20,
        until: 900,
      },
    ],
    rules: [
      { id: "p1", at: 30, secret: "/secrets/pay", from: "/agents/pay" },
      { id: "p2", at: 40, verb: "itx.whatsapp.*" },
    ],
    requests: [
      {
        digest: digest("c"),
        secret: "/secrets/pay",
        summary: "POST api.example.com",
        at: 50,
        until: 900,
      },
    ],
  });
  // no row carries what a member signs for: the mail's words, the call's arguments, the body
  const said = JSON.stringify(waiting);
  for (const hidden of ["Hello.", '"args"', "amount", "to=jo"]) expect(said).not.toContain(hidden);
});

test("an act past its decision or past its day waits no more", () => {
  const row = { text: CALL, at: 10, waited: false };
  const request = { text: REQUEST, at: 10 };
  const waiting = waitingOf(
    {
      gate: {
        held: [
          { ...row, digest: digest("a"), until: 900, state: "approved" },
          { ...row, digest: digest("b"), until: 100, state: "waiting" },
          { ...row, digest: digest("c"), until: 101, state: "waiting" },
        ],
        proposed: [],
      },
      secrets: [
        {
          path: "/secrets/pay",
          held: [
            { ...request, digest: digest("d"), until: 900, state: "approved" },
            { ...request, digest: digest("e"), until: 100, state: "waiting" },
          ],
        },
      ],
    },
    100,
  );
  expect(waiting.acts.map((act) => act.digest)).toEqual([digest("c")]);
  expect(waiting.requests).toEqual([]);
});

test("a text the gate cannot read still counts, as a row that says nothing of it", () => {
  const waiting = waitingOf(
    {
      gate: {
        held: [{ digest: digest("a"), text: "{", at: 1, until: 9, state: "waiting", waited: false }],
        proposed: [],
      },
      secrets: [
        {
          path: "/secrets/pay",
          held: [{ digest: digest("b"), text: "{", at: 1, until: 9, state: "waiting" }],
        },
      ],
    },
    5,
  );
  expect(waiting.acts).toEqual([{ digest: digest("a"), act: "", summary: "An act", at: 1, until: 9 }]);
  expect(waiting.requests).toMatchObject([{ summary: "A request" }]);
});
