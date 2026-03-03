import { Menu, dialog, type BrowserWindow } from 'electron';
import { IPC } from './constants';

/** Build and set the application menu. */
export function buildMenu(mainWindow: BrowserWindow): void {
  const sendAction = (action: string): void => {
    mainWindow.webContents.send(IPC.MENU_ACTION, action);
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendAction('new-note'),
        },
        {
          label: 'New Child Note',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => sendAction('new-child-note'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendAction('save'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendAction('find'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Focus Tree',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendAction('focus-tree'),
        },
        {
          label: 'Focus Editor',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendAction('focus-editor'),
        },
        {
          label: 'Focus Search',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendAction('focus-search'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About TreeNote',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About TreeNote',
              message: 'TreeNote v1.0.0',
              detail: 'A hierarchical notes management application.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
