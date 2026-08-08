/**
 * AI Travel Planner — single-command launcher.
 *
 * Usage:
 *   npm start        (or)   npm run dev     (or)   node scripts/start.js
 *
 * Starts, in order:
 *   1. Ollama (local LLM server, port 11434) — skipped if already running
 *   2. FastAPI backend (port 8001)
 *   3. Vite frontend (port 5173)
 *
 * Works in any terminal / IDE (VS Code, Cursor, etc.) on Windows, macOS and Linux.
 */
const { spawn, execFile } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

const OLLAMA_PORT = 11434;
const OLLAMA_MODEL = "qwen3:8b"; // keep in sync with backend/config.py

function findPython() {
  const candidates = [
    path.join(root, ".venv", "Scripts", "python.exe"), // Windows venv
    path.join(root, ".venv", "bin", "python"), // macOS/Linux venv
    path.join(root, "venv", "Scripts", "python.exe"),
    path.join(root, "venv", "bin", "python"),
    "python",
    "python3",
  ];
  for (const c of candidates) {
    if (typeof c === "string" && (c === "python" || c === "python3")) return c;
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return "python";
}

function findOllama() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama"),
    path.join(process.env.ProgramFiles || "", "Ollama", "ollama.exe"),
    "ollama",
  ];
  for (const c of candidates) {
    if (c === "ollama") return c;
    try {
      if (fs.existsSync(c)) return c;
    } catch (_) {}
  }
  return "ollama";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isPortOpen(port, host = "127.0.0.1", timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
    socket.connect(port, host);
  });
}

let ollama, backend, frontend;
let startedOllama = false;

async function ensureOllama() {
  const alreadyRunning = await isPortOpen(OLLAMA_PORT);
  if (alreadyRunning) {
    console.log(`  • Ollama   : already running on :${OLLAMA_PORT} ✓`);
  } else {
    const ollamaBin = findOllama();
    console.log(`  • Ollama   : starting local LLM server (${ollamaBin} serve)…`);
    ollama = spawn(ollamaBin, ["serve"], {
      cwd: root,
      stdio: "inherit",
      shell: isWin,
      windowsHide: true,
    });
    startedOllama = true;

    // Wait up to ~30s for the server to come up
    let up = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      if (await isPortOpen(OLLAMA_PORT)) { up = true; break; }
    }
    if (!up) {
      console.error("\n  ⚠️  Ollama did not start. The app will fall back to rule-based planning.\n");
    } else {
      console.log(`  • Ollama   : ready on :${OLLAMA_PORT} ✓`);
    }
  }

  // Verify the configured model exists (one-time pull is user's choice)
  const ollamaBin = findOllama();
  execFile(ollamaBin, ["list"], { timeout: 8000 }, (err, stdout) => {
    if (err) return;
    const hasModel = new RegExp(`^${OLLAMA_MODEL}(:|\\s|$)`, "m").test(stdout || "");
    if (!hasModel) {
      console.log(
        `\n  ⚠️  Model '${OLLAMA_MODEL}' is not pulled yet.\n` +
        `     Run once:  ollama pull ${OLLAMA_MODEL}\n`
      );
    }
  });
}

const python = findPython();

async function warnIfPortBusy(port, name) {
  if (await isPortOpen(port)) {
    console.warn(`  ⚠️  Port ${port} (${name}) is already in use — another instance may be running.`);
    console.warn(`     Stop it first, or the new ${name} may fail to start / the app may point at the old one.`);
  }
}

function startBackend() {
  backend = spawn(python, ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8001"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  backend.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️  Backend exited with code ${code}. Is port 8001 already in use?\n`);
    }
  });
}

function startFrontend() {
  frontend = spawn("npm", ["run", "dev"], {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
    shell: isWin,
  });
  frontend.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️  Frontend exited with code ${code}.\n`);
    }
  });
}

(async () => {
  console.log(`\n  🌍 AI Travel Planner\n  ${"─".repeat(50)}`);
  console.log(`  • Ollama   : http://localhost:${OLLAMA_PORT} (model: ${OLLAMA_MODEL})`);
  console.log(`  • Backend  : ${python} -m uvicorn backend.main:app --port 8001`);
  console.log(`  • Frontend : http://localhost:5173`);
  console.log(`  ${"─".repeat(50)}\n`);

  await ensureOllama();
  await warnIfPortBusy(8001, "backend");
  await warnIfPortBusy(5173, "frontend");
  startBackend();
  startFrontend();
})();

const shutdown = () => {
  console.log("\n  👋 Shutting down...\n");
  if (frontend) frontend.kill();
  if (backend) backend.kill();
  if (ollama && startedOllama) ollama.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
