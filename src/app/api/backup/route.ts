import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "データベースファイルが見つかりません。" }, { status: 404 });
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    const filename = `dev_${timestamp}.db`;
    const destPath = path.join(backupDir, filename);

    fs.copyFileSync(dbPath, destPath);

    return NextResponse.json({ success: true, filename, path: destPath });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "バックアップ中にエラーが発生しました。" }, { status: 500 });
  }
}
