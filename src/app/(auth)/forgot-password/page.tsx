"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        setError(d.error ?? "エラーが発生しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
            <Mail className="h-7 w-7 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">パスワードをお忘れですか？</h1>
          <p className="text-gray-500 text-sm mt-2">
            登録済みのメールアドレスを入力してください。<br />
            パスワード再設定用のリンクをお送りします。
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">メールを送信しました</h2>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{email}</strong> にパスワードリセット用のリンクを送信しました。<br />
              メールが届かない場合は迷惑メールフォルダもご確認ください。<br />
              リンクの有効期限は1時間です。
            </p>
            <Link href="/login" className="text-blue-700 hover:underline text-sm font-medium">
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? "送信中..." : "リセットリンクを送信"}
            </button>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                ログイン画面に戻る
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
