import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "パスワードは8文字以上で入力してください" }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return NextResponse.json({ error: "リンクが無効です。再度パスワードリセットを申請してください" }, { status: 400 });
  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ error: "リンクの有効期限が切れています。再度申請してください" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email: record.email }, data: { password: hashed } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
