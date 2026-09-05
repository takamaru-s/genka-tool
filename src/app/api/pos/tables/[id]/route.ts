import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { number, name, capacity } = await req.json();

  const table = await prisma.table.updateMany({
    where: { id, userId: session.user.id },
    data: { number: Number(number), name, capacity: Number(capacity) },
  });

  return NextResponse.json(table);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.table.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
