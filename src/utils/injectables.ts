import { QuickPickItem, window } from 'vscode';

import { findAnalysis, Injectable } from './analysis';

/**
 * Locates a list of injectables
 *
 * @param aPython - name of the python exectuable
 * @param aUpdate - identifier to check if we want to update
 *
 * @returns an observable of the lines
 */
export async function findInjectables(
  aPython: string,
  aUpdate: boolean
): Promise<Injectable[]> {
  // local script
  const analysis = await findAnalysis(aPython, aUpdate);
  return analysis.injectables;
}

interface QuickPickInjectable extends QuickPickItem {
  injectable: Injectable;
}

function createQuickPickInjectable(
  injectable: Injectable
): QuickPickInjectable {
  const { name, pkg, type } = injectable;
  return { injectable, label: name, description: pkg, detail: type };
}

const EMPTY_INJECTABLE: Injectable = {
  name: '↻ Reload ...',
  pkg: '',
  type: 'Reload list of injectables.',
};

function getInjectables(
  aPython: string,
  aUpdate: boolean
): Promise<QuickPickInjectable[]> {
  // create a new copy
  return findInjectables(aPython, aUpdate)
    .then((items) => items.map(createQuickPickInjectable))
    .then((items) => [createQuickPickInjectable(EMPTY_INJECTABLE), ...items]);
}

async function _selectInjectable(
  aPython: string,
  aUpdate: boolean
): Promise<Injectable> {
  // injectables
  const inj$ = getInjectables(aPython, aUpdate);
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
  return selected.injectable;
}

export async function selectInjectable(aPython: string): Promise<Injectable> {
  // extracted tuple
  let inj = await _selectInjectable(aPython, false);
  while (inj === EMPTY_INJECTABLE) {
    inj = await _selectInjectable(aPython, true);
  }
  // return the tuple
  return inj;
}
