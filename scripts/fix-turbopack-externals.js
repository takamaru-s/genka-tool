/**
 * Turbopack が生成するハッシュ付き外部モジュール名（例: bcryptjs-ee66c2bdc904f2cf）を
 * 実際のパッケージに解決するプロキシモジュールを standalone/node_modules に作成する。
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const chunksDir = path.join(root, ".next", "server", "chunks");
const standaloneNodeModules = path.join(root, ".next", "standalone", "node_modules");

// .js ファイルを再帰的に収集
function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".map")) {
      results.push(full);
    }
  }
  return results;
}

// チャンクから "packagename-16hexchars" 形式の外部モジュール名を抽出
function findHashedExternals(files) {
  const found = new Set();
  // 16文字の16進数ハッシュで終わるモジュール名にマッチ
  const re = /"((?:@[^"/]+\/)?[^"]+)-([0-9a-f]{16})"/g;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    let m;
    while ((m = re.exec(content)) !== null) {
      const hashedName = m[1] + "-" + m[2];
      const baseName = m[1];
      // 実際のパッケージが存在するものだけを対象にする
      const basePkg = path.join(standaloneNodeModules, ...baseName.split("/"));
      if (fs.existsSync(basePkg)) {
        found.add(JSON.stringify({ hashedName, baseName }));
      }
    }
  }
  return [...found].map((s) => JSON.parse(s));
}

// プロキシモジュールを作成
function createProxy(hashedName, baseName) {
  const proxyDir = path.join(standaloneNodeModules, ...hashedName.split("/"));
  if (fs.existsSync(proxyDir)) return false; // すでに存在

  fs.mkdirSync(proxyDir, { recursive: true });

  fs.writeFileSync(
    path.join(proxyDir, "package.json"),
    JSON.stringify({ name: hashedName, version: "0.0.0", main: "index.js" }, null, 2)
  );

  fs.writeFileSync(
    path.join(proxyDir, "index.js"),
    `// Turbopack external proxy\nmodule.exports = require(${JSON.stringify(baseName)});\n`
  );

  return true;
}

if (!fs.existsSync(chunksDir)) {
  console.log("chunks ディレクトリが見つかりません。npm run build を先に実行してください。");
  process.exit(1);
}

const jsFiles = collectJsFiles(chunksDir);
const externals = findHashedExternals(jsFiles);

if (externals.length === 0) {
  console.log("✓ Turbopack ハッシュ外部モジュールなし（対処不要）");
} else {
  let created = 0;
  for (const { hashedName, baseName } of externals) {
    if (createProxy(hashedName, baseName)) {
      console.log(`  proxy: ${hashedName} → ${baseName}`);
      created++;
    }
  }
  console.log(
    `✓ Turbopack 外部モジュールプロキシ作成: ${created}件 / 検出${externals.length}件`
  );
}
