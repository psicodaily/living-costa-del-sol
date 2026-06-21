// Centro de control — servidor local del panel de progreso.
//
// Sirve una pagina web (en localhost) que muestra:
//  1) El "tablero fiable": tareas que Claude anota en state.json.
//  2) El "rastro automatico": workflows en segundo plano leidos del
//     directorio de sesiones de Claude Code (mejor esfuerzo).
//  3) Si el juego (Vite) esta encendido.
//
// Sin dependencias externas: solo modulos nativos de Node.
// Arranque:  npm run panel

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PANEL_PORT) || 4756;
const GAME_PORT = Number(process.env.GAME_PORT) || 5173;
const STATE_FILE = path.join(__dirname, "state.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const CLAUDE_PROJECTS = path.join(os.homedir(), ".claude", "projects");
const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // un workflow se considera "activo" si su rastro se movio hace <5 min

// --- Tablero fiable: lee state.json -------------------------------------

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      version: data.version || null,
      note: data.note || null,
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      roadmap: Array.isArray(data.roadmap) ? data.roadmap : [],
    };
  } catch {
    return { version: null, note: null, tasks: [], roadmap: [] };
  }
}

// --- Rastro automatico: escanea los workflows de Claude Code -------------

async function listDirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

// Localiza los directorios de sesion de ESTE proyecto (los que mencionan "Marbella").
async function findProjectSessionDirs() {
  const projects = await listDirs(CLAUDE_PROJECTS);
  const mine = projects.filter((n) => /marbella/i.test(n));
  const sessions = [];
  for (const proj of mine) {
    const projPath = path.join(CLAUDE_PROJECTS, proj);
    for (const sess of await listDirs(projPath)) {
      sessions.push(path.join(projPath, sess));
    }
  }
  return sessions;
}

// Intenta sacar un nombre legible del workflow a partir del script guardado.
async function friendlyName(sessionDir, wfId) {
  const scriptsDir = path.join(sessionDir, "workflows", "scripts");
  try {
    const files = await fs.readdir(scriptsDir);
    const hit = files.find((f) => f.includes(wfId));
    if (hit) return hit.replace(`-${wfId}.js`, "").replace(/-/g, " ");
  } catch {
    /* sin scripts: usamos el id */
  }
  return wfId;
}

// Lee un journal.jsonl y cuenta agentes arrancados / terminados.
async function readJournal(journalPath) {
  let started = new Set();
  let done = new Set();
  try {
    const raw = await fs.readFile(journalPath, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      if (!evt.key) continue;
      if (evt.type === "started") started.add(evt.key);
      if (evt.type === "result" || evt.type === "error") done.add(evt.key);
    }
  } catch {
    return null;
  }
  return { started: started.size, done: done.size };
}

async function scanWorkflows() {
  const out = [];
  const sessions = await findProjectSessionDirs();
  for (const sessionDir of sessions) {
    const wfBase = path.join(sessionDir, "subagents", "workflows");
    for (const wfId of await listDirs(wfBase)) {
      const runDir = path.join(wfBase, wfId);
      const journalPath = path.join(runDir, "journal.jsonl");
      const counts = await readJournal(journalPath);
      if (!counts) continue;
      let mtime = 0;
      try {
        mtime = (await fs.stat(journalPath)).mtimeMs;
      } catch {
        /* ignore */
      }
      const running = Math.max(0, counts.started - counts.done);
      const recent = Date.now() - mtime < ACTIVE_WINDOW_MS;
      const active = running > 0 && recent;
      out.push({
        id: wfId,
        name: await friendlyName(sessionDir, wfId),
        started: counts.started,
        done: counts.done,
        running,
        active,
        recent,
        updatedAt: mtime ? new Date(mtime).toISOString() : null,
      });
    }
  }
  // Mas recientes primero.
  out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return out;
}

// --- Esta el juego encendido? -------------------------------------------

function checkGame() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: GAME_PORT, path: "/", timeout: 350 },
      (res) => {
        res.resume();
        resolve(true);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// --- Servidor HTTP ------------------------------------------------------

async function serveFile(res, filePath, contentType) {
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/state") {
    const [state, workflows, gameUp] = await Promise.all([
      readState(),
      scanWorkflows(),
      checkGame(),
    ]);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        serverTime: new Date().toISOString(),
        version: state.version,
        note: state.note,
        tasks: state.tasks,
        roadmap: state.roadmap,
        workflows,
        game: { up: gameUp, url: `http://localhost:${GAME_PORT}` },
      })
    );
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    await serveFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("No encontrado");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("");
    console.error(`  El puerto ${PORT} ya está ocupado.`);
    console.error(`  Quizá el panel ya esté abierto en http://localhost:${PORT}`);
    console.error(`  O usa otro puerto:  PANEL_PORT=4322 npm run panel`);
    console.error("");
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log("");
  console.log("  Centro de control — GTA Marbella");
  console.log("  ---------------------------------");
  console.log(`  Panel abierto en: ${url}`);
  console.log(`  Juego esperado en: http://localhost:${GAME_PORT}`);
  console.log("  (Deja esta ventana abierta. Ctrl+C para cerrar el panel.)");
  console.log("");

  if (process.platform === "win32" && process.env.PANEL_NO_OPEN !== "1") {
    exec(`start "" ${url}`);
  }
});
