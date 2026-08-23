export async function register() {
  // SQLite (Electron) 環境のみ起動時マイグレーションを実行
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL?.startsWith("file:")) {
    const { runMigrations } = await import("./lib/migrate");
    await runMigrations();
  }
}
