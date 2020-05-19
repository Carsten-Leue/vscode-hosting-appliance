import { commands, workspace } from 'vscode';

import { EXT_NAME } from '../constants';

function fail<T>(aMessage: string) {
  return Promise.reject<T>(new Error(aMessage));
}

export function openSettings() {
  return commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:carsten-leue.${EXT_NAME}`
  );
}

export function getLpar(): PromiseLike<string> {
  const { lpar } = workspace.getConfiguration('ha');
  // display
  if (!lpar) {
    return openSettings().then(() => fail('LPAR not configured'));
  }
  // success
  return Promise.resolve(lpar);
}

export function getUsername(): PromiseLike<string> {
  const { https } = workspace.getConfiguration('ha');
  // display
  if (!https || !https.username) {
    return openSettings().then(() => fail('Username not configured'));
  }
  // success
  return Promise.resolve(https.username);
}

export function getPassword(): PromiseLike<string> {
  const { https } = workspace.getConfiguration('ha');
  // display
  if (!https || !https.password) {
    return openSettings().then(() => fail('Username not configured'));
  }
  // success
  return Promise.resolve(https.password);
}
