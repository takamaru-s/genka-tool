import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId, guestCount } = await req.json();
  if (!tableId) return NextResponse.json({ error: "tableIdは必須です" }, { status: 400 });

  const tableSession = await prisma.tableSession.create({
    data: { userId: session.user.id, tableId, guestCount: Number(guestCount) || 1 },
  });

  return NextResponse.json(tableSession);
}
