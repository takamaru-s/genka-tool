/**
 * ビルド前に空のseed.dbを作成するスクリプト。
 * 配布時にユーザーのPCへコピーされ、初回起動時のDBとして使われる。
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const seedDb = path.join(__dirname, "..", "prisma", "seed.db");

if (fs.existsSync(seedDb)) fs.unlinkSync(seedDb);

console.log("空のseed.dbを作成中...");

execSync("npx prisma db push --skip-generate", {
  env: {
    ...process.env,
    DATABASE_URL: `file:${seedDb}`,
  },
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
});

console.log("✓ prisma/seed.db を作成しました");

// Turbopack ハッシュ外部モジュールのプロキシを作成
require("./fix-turbopack-externals");

// standalone ビルドの .env から DATABASE_URL を削除
// (Electron が起動時に正しい DATABASE_URL を渡すため、.env の値に上書きされないようにする)
const standaloneEnv = path.join(__dirname, "..", ".next", "standalone", ".env");
if (fs.existsSync(standaloneEnv)) {
  const content = fs.readFileSync(standaloneEnv, "utf8");
  const cleaned = content
    .split("\n")
    .filter((line) => !line.startsWith("DATABASE_URL"))
    .join("\n");
  fs.writeFileSync(standaloneEnv, cleaned);
  console.log("✓ standalone/.env から DATABASE_URL を削除しました");
}
