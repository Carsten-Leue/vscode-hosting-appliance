import { first, tap } from 'rxjs/operators';
import { ExtensionContext, OutputChannel, Uri, workspace } from 'vscode';

import { getVirtualEnvironment } from '../utils/venv';

/**
 * Returns the key for this mapping of file to venv
 *
 * @param aRelName - relative filename
 *
 * @returns the key
 */
function getKey(aRelName: string): string {
  return `venv:${aRelName}`;
}

const VALUE_UNDEFINED = '::';

function boxUndefined(aValue: string | undefined): string {
  return aValue || VALUE_UNDEFINED;
}

function unboxUndefined(aValue: string): string | undefined {
  return aValue === VALUE_UNDEFINED ? undefined : aValue;
}

/**
 * Returns the root of the virtual environment or undefined if there is none
 *
 * @param aFileName - the file URI
 * @param aChannel - the debug channel
 * @param aContext - the extension context for caching
 *
 * @returns the root of the virtual environment or undefined
 */
async function getVirtualEnvironmentCacheMiss(
  aFileName: Uri,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // locate the workspace
  const relPath = workspace.asRelativePath(aFileName);
  // cache key
  const key = getKey(relPath);
  // check for the existence of a cached file
  const memento = aContext.workspaceState;
  const cachedResult = memento.get<string>(key);
  if (cachedResult) {
    // actual value
    const root = unboxUndefined(cachedResult);
    // log this
    aChannel.appendLine(`Reading venv ${relPath} -> ${root} from cache.`);
    // return the cached version
    return root;
  }
  // locate the root directory
  const fullPath = aFileName.fsPath;
  const rootDir = fullPath.substr(0, fullPath.length - relPath.length - 1);
  // locate the file
  const result = await getVirtualEnvironment(fullPath, rootDir)
    .pipe(first())
    .toPromise();
  // log this
  aChannel.appendLine(`Updating venv ${relPath} -> ${result}.`);
  // update the result
  await memento.update(key, boxUndefined(result));
  // ok
  return result;
}

const VENV_CACHE: Record<string, Thenable<string | undefined>> = {};

/**
 * Returns the root of the virtual environment or undefined if there is none
 *
 * @param aFileName - the file URI
 * @param aChannel - the debug channel
 * @param aContext - the extension context for caching
 *
 * @returns the root of the virtual environment or undefined
 */
export function getVirtualEnvironmentDir(
  aFileName: Uri,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<string | undefined> {
  // key
  const key = aFileName.toString();
  // lookup in the cache
  return (
    VENV_CACHE[key] ||
    (VENV_CACHE[key] = getVirtualEnvironmentCacheMiss(
      aFileName,
      aChannel,
      aContext
    ))
  );
}
