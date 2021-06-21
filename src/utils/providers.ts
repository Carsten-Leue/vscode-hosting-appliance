import { QuickPickItem, window } from 'vscode';

import { Definition, findAnalysis, Injectable, Module } from './analysis';
import { selectInjectable } from './injectables';

export declare type Provider = Definition | Module;

function isEqual(aLeft: Injectable, aRight: Injectable): boolean {
  return (
    aLeft === aRight ||
    (aLeft &&
      aRight &&
      aLeft.name === aRight.name &&
      aLeft.pkg === aRight.pkg &&
      aLeft.type === aRight.type)
  );
}

/**
 * Locates a list of providers
 *
 * @param aPython - name of the python exectuable
 * @param aInjectable - the injectable to search for
 * @param aUpdate - identifier to check if we want to update
 *
 * @returns an observable of the lines
 */
export async function findProviders(
  aPython: string,
  aInjectable: Injectable,
  aUpdate: boolean
): Promise<Provider[]> {
  // local script
  const analysis = await findAnalysis(aPython, aUpdate);
  // the predicate
  const finder = (aOther: Injectable) => isEqual(aInjectable, aOther);
  // filter the definitions
  const definitions = analysis.definitions.filter((definition) =>
    finder(definition.exports)
  );
  const modules = analysis.modules.filter((module) =>
    module.exports.find(finder)
  );
  // merge
  return [...definitions, ...modules];
}

interface QuickPickInjectable extends QuickPickItem {
  provider: Provider;
}

function createQuickPickInjectable(provider: Provider): QuickPickInjectable {
  const { name, pkg, exports } = provider;
  const detail = Array.isArray(exports)
    ? exports.map(({ name }) => name).join(', ')
    : exports.name;
  return { provider, label: name, description: pkg, detail };
}

const EMPTY_PROVIDER: Module = {
  name: '↻ Reload ...',
  pkg: '',
  exports: [],
  imports: [],
};

function getProviders(
  aPython: string,
  aInjectable: Injectable,
  aUpdate: boolean
): Promise<QuickPickInjectable[]> {
  // create a new copy
  return findProviders(aPython, aInjectable, aUpdate)
    .then((items) => items.map(createQuickPickInjectable))
    .then((items) => [createQuickPickInjectable(EMPTY_PROVIDER), ...items]);
}

async function _selectProvider(
  aPython: string,
  aInjectable: Injectable,
  aUpdate: boolean
): Promise<Provider> {
  // injectables
  const inj$ = getProviders(aPython, aInjectable, aUpdate);
  // update
  const selected = await window.showQuickPick(inj$, {
    placeHolder: 'Providers',
    matchOnDescription: true,
    matchOnDetail: false,
    canPickMany: false,
  });
  // extract the items
  if (!selected) {
    throw new Error('No item selected');
  }
  // extracted tuple
  return selected.provider;
}

export async function selectProvider(
  aPython: string,
  aInjectable?: Injectable
): Promise<Provider> {
  // check if we can select it
  const inj = aInjectable ? aInjectable : await selectInjectable(aPython);
  // extracted tuple
  let provider = await _selectProvider(aPython, inj, false);
  while (provider === EMPTY_PROVIDER) {
    provider = await _selectProvider(aPython, inj, true);
  }
  // return the tuple
  return provider;
}
