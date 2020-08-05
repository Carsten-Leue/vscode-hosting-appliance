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

const EMPTY_TUPLE: [string, string, string] = ['', '', ''];

function createRefresh(): QuickPickInjectable {
  return {
    tuple: EMPTY_TUPLE,
    label: '↻ Reload ...',
    description: 'Reload list of injectables.',
  };
}

let CACHED_INJECTABLES: Promise<QuickPickInjectable[]> | undefined;
let PYTHON_DIR: string | undefined;

function getInjectables(aPython: string): Promise<QuickPickInjectable[]> {
  // return a cached copy if possible
  if (aPython === PYTHON_DIR && CACHED_INJECTABLES) {
    return CACHED_INJECTABLES;
  }
  // create a new copy
  PYTHON_DIR = aPython;
  CACHED_INJECTABLES = findInjectables(aPython)
    .then((items) => items.map(createQuickPickInjectable))
    .then((items) => [createRefresh(), ...items]);
  // returns the list
  return CACHED_INJECTABLES;
}

async function _selectInjectable(
  aPython: string
): Promise<[string, string, string]> {
  // injectables
  const inj$ = getInjectables(aPython);
  // update
  const selected = await window.showQuickPick(inj$, {
    placeHolder: 'Injectables',
    matchOnDescription: true,
    matchOnDetail: true,
    canPickMany: false,
  });
  // extract the items
  if (!selected) {
    throw new Error('No item selected');
  }
  // extracted tuple
  return selected.tuple;
}

export async function selectInjectable(
  aPython: string
): Promise<[string, string, string]> {
  // extracted tuple
  let tuple = await _selectInjectable(aPython);
  while (tuple === EMPTY_TUPLE) {
    CACHED_INJECTABLES = undefined;
    tuple = await _selectInjectable(aPython);
  }
  // return the tuple
  return tuple;
}
