import { NextResponse } from "next/server";

export async function GET() {
  const lanIP = process.env.LAN_IP ?? "localhost";
  const port = process.env.PORT ?? "3000";
  const url = `http://${lanIP}:${port}`;
  return NextResponse.json({ lanIP, port, url });
}
