const { app, BrowserWindow, utilityProcess, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const os = require("os");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return "localhost";
}

const PORT = 3000;
let mainWindow = null;
let serverChild = null;

function getDbPath() {
  return path.join(app.getPath("userData"), "genka.db");
}

function initDb() {
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) return;

  const seedPath = app.isPackaged
    ? path.join(process.resourcesPath, "seed.db")
    : path.join(__dirname, "..", "prisma", "seed.db");

  if (fs.existsSync(seedPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.copyFileSync(seedPath, dbPath);
  } else {
    console.warn("seed.db が見つかりません。空のDBで起動します。");
  }
}

function startServer() {
  const dbPath = getDbPath();

  const serverScript = app.isPackaged
    ? path.join(process.resourcesPath, "server", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `サーバーファイルが見つかりません。\n` +
        `先に "npm run build" を実行してください。\n\n` +
        `パス: ${serverScript}`
    );
  }

  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(__dirname, "..", ".next", "standalone");

  const logPath = path.join(app.getPath("userData"), "server.log");
  // Truncate log on each start
  fs.writeFileSync(logPath, `=== Server start ${new Date().toISOString()} ===\n`);

  const lanIP = getLocalIP();

  serverChild = utilityProcess.fork(serverScript, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "production",
      DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
      NEXTAUTH_SECRET: "genka-tool-local-secret-key",
      NEXTAUTH_URL: `http://${lanIP}:${PORT}`,
      LAN_IP: lanIP,
    },
    cwd: serverDir,
    stdio: "pipe",
  });

  serverChild.stdout.on("data", (data) => {
    fs.appendFileSync(logPath, data);
  });
  serverChild.stderr.on("data", (data) => {
    fs.appendFileSync(logPath, data);
  });

  serverChild.on("exit", (code) => {
    if (code !== 0 && mainWindow) {
      const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").slice(-2000) : "";
      dialog.showErrorBox(
        "サーバーエラー",
        `サーバーが予期せず終了しました（コード: ${code}）\n\nログ:\n${log}`
      );
    }
  });
}

function waitForServer(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        res.resume();
        resolve();
      });
      req.setTimeout(1000);
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("サーバーの起動がタイムアウトしました（30秒）"));
        } else {
          setTimeout(check, 500);
        }
      });
      req.on("timeout", () => {
        req.destroy();
        setTimeout(check, 500);
      });
    }
    setTimeout(check, 1500);
  });
}

async function createWindow() {
  try {
    initDb();
    startServer();
    await waitForServer();
  } catch (err) {
    dialog.showErrorBox("起動エラー", err.message || String(err));
    app.quit();
    return;
  }

  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "原価管理ツール",
    backgroundColor: "#fffbf0",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  if (serverChild) serverChild.kill();
});

app.on("window-all-closed", () => {
  app.quit();
});
