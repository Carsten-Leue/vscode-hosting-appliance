import { join } from 'path';
import { spawnJson } from './shell';
import { window, QuickPickItem } from 'vscode';
import { ASSET_ROOT } from './assets';

/**
 * Locates a list of injectables
 *
 * @param aPython - name of the python exectuable
 * @param aLpar - identifier of the LPAR, we assume that `ssh LPAR` works
 *
 * @returns an observable of the lines
 */
export async function findInjectables(
  aPython: string
): Promise<[[string, string, string]]> {
  // local script
  const script = join(ASSET_ROOT, 'python', 'injectables.py');
  // dispatch
  return spawnJson(aPython, [script]);
}

interface QuickPickInjectable extends QuickPickItem {
  tuple: [string, string, string];
}

function createQuickPickInjectable(
  tuple: [string, string, string]
): QuickPickInjectable {
  const [label, description, detail] = tuple;
  return { tuple, label, description, detail };
}

export async function selectInjectable(
  aPython: string
): Promise<[string, string, string]> {
  // injectables
  const inj$ = findInjectables(aPython).then((items) =>
    items.map(createQuickPickInjectable)
  );
  // update
  const selected = await window.showQuickPick(inj$, {
    placeHolder: 'Injectables',
    matchOnDescription: true,
    matchOnDetail: true,
    canPickMany: false,
  });
  // extract
  if (!selected) {
    throw new Error('No item selected');
  }
  return selected.tuple;
}
