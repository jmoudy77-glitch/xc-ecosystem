import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return res.status(200).json({ ok: true, msg: "Webhook works", method: "POST" });
  }

  res.setHeader("Allow", "POST");
  return res.status(405).json({ error: "Method Not Allowed", method: req.method });
}
