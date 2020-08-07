import { commands } from 'vscode';

export function insertImport(module: string, symbol: string) {
  return commands.executeCommand('importMagic.insertImport', module, symbol);
}
