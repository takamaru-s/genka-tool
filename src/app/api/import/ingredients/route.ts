import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/parse-csv";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

  const { csv, mode } = await req.json() as { csv: string; mode: "skip" | "overwrite" };
  if (!csv) return NextResponse.json({ error: "CSVデータがありません。" }, { status: 400 });

  // Strip BOM
  const text = csv.replace(/^﻿/, "");
  const rows = parseCSV(text);

  if (rows.length < 2) return NextResponse.json({ error: "データ行がありません。" }, { status: 400 });

  // Skip header row; columns: 食材名(0), 単位(1), 内容量(2), 仕入価格（円）(3)
  const dataRows = rows.slice(1);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const lineNum = i + 2;

    const name = row[0];
    const unit = row[1];
    const packageSize = parseFloat(row[2]);
    const packagePrice = parseFloat(row[3]);

    if (!name) { errors.push(`行${lineNum}: 食材名が空です`); continue; }
    if (!unit) { errors.push(`行${lineNum}: 単位が空です`); continue; }
    if (isNaN(packageSize) || packageSize <= 0) { errors.push(`行${lineNum}: 内容量が無効です (${row[2]})`); continue; }
    if (isNaN(packagePrice) || packagePrice < 0) { errors.push(`行${lineNum}: 仕入価格が無効です (${row[3]})`); continue; }

    const existing = await prisma.ingredient.findFirst({
      where: { name, userId: session.user.id },
    });

    if (existing) {
      if (mode === "skip") {
        skipped++;
      } else {
        await prisma.ingredient.update({
          where: { id: existing.id },
          data: { unit, packageSize, packagePrice },
        });
        updated++;
      }
    } else {
      await prisma.ingredient.create({
        data: { name, unit, packageSize, packagePrice, userId: session.user.id },
      });
      created++;
    }
  }

  return NextResponse.json({ created, updated, skipped, errors });
}
