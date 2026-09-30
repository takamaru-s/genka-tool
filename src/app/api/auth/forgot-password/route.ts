import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });

  // ユーザー存在確認（存在しない場合も成功を返してメール列挙を防ぐ）
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });

  // 既存の未使用トークンを削除
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1時間有効

  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://genka-tool-one.vercel.app";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const fromEmail = process.env.FROM_EMAIL ?? "noreply@resend.dev";

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "【原価管理ツール】パスワードリセットのご案内",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#1e40af;margin-bottom:16px;">パスワードリセット</h2>
        <p style="color:#374151;line-height:1.7;">
          ${user.name} 様<br><br>
          パスワードリセットのリクエストを受け付けました。<br>
          以下のボタンから新しいパスワードを設定してください。
        </p>
        <div style="margin:32px 0;text-align:center;">
          <a href="${resetUrl}"
             style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
            パスワードを再設定する
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;">
          このリンクは1時間後に無効になります。<br>
          心当たりのない場合は、このメールを無視してください。
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;">原価管理ツール</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
