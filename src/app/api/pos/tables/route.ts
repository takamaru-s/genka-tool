import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tables = await prisma.table.findMany({
    where: { userId: session.user.id },
    orderBy: { number: "asc" },
    include: {
      sessions: {
        where: { status: "open" },
        include: { orderItems: true },
        take: 1,
      },
    },
  });

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { number, name, capacity } = await req.json();
  if (!number || !name) return NextResponse.json({ error: "番号と名前は必須です" }, { status: 400 });

  const table = await prisma.table.create({
    data: { userId: session.user.id, number: Number(number), name, capacity: Number(capacity) || 4 },
  });

  return NextResponse.json(table);
}
