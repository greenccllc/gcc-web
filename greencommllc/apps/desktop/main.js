const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

// Keep a global reference so the window isn't GC'd
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'GCC Proposal Generator',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Allow file access so localStorage / blob: URLs work correctly
      webSecurity: false,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#FDFBF4',   // --cream, shown while page loads
    show: false,                   // reveal after ready-to-show to avoid white flash
  });

  // Load the bundler HTML directly from the renderer folder
  const appHtml = path.join(__dirname, 'renderer', 'bundle-builder.html');
  mainWindow.loadFile(appHtml);

  // Smooth reveal once page has painted
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open DevTools in dev mode
  if (process.env.GCC_DEV) mainWindow.webContents.openDevTools();

  // Open external links in the system browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Menu ─────────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Proposal',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.reload(),
        },
        { type: 'separator' },
        {
          label: 'Open Proposal File…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              title: 'Open Proposal File',
              filters: [{ name: 'HTML Files', extensions: ['html'] }],
              properties: ['openFile'],
            });
            if (!canceled && filePaths[0]) mainWindow.loadFile(filePaths[0]);
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.openDevTools(),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About GCC Proposal Generator',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'GCC Proposal Generator',
            message: 'GCC Proposal Generator v1.0',
            detail: 'GCC LLC — Low-Voltage Division 27/28\n\nOffline-capable single-file app.\nAll changes are saved in your browser localStorage.',
          }),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
