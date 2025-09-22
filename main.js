console.log("main.js is being executed");

const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function criarArquivoSeNaoExiste(nome) {
  const filePath = path.join(dataDir, nome);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }
}

["clientes.json", "veiculos.json", "servicos.json", "configuracao.json", "orcamentos.json"].forEach(
  criarArquivoSeNaoExiste
);

ipcMain.handle("read-data", (event, filename) => {
  console.log(`Reading data from ${filename}`);
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
});

ipcMain.handle("write-data", (event, filename, data) => {
  console.log(`Writing data to ${filename}`);
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle("save-file", (event, fileBuffer, destinationFilename) => {
  const destPath = path.join(dataDir, destinationFilename);
  try {
    fs.writeFileSync(destPath, Buffer.from(fileBuffer));
    return path.join("data", destinationFilename).replace(/\\/g, "/");
  } catch (error) {
    console.error("Erro ao salvar arquivo:", error);
    return null;
  }
});

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net;",
        ],
      },
    });
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
