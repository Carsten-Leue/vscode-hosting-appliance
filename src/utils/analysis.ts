import { join } from 'path';
import { OperatorFunction, pipe } from 'rxjs';
import { filter, first, map, reduce } from 'rxjs/operators';

import { ASSET_ROOT } from './assets';
import { rxSpawn, SPAWN_OUTPUT_TYPE } from './shell';

export interface Entity {
  name: string;
  pkg: string;
}

export interface Injectable extends Entity {
  type: string;
}

export interface Module extends Entity {
  exports: Injectable[];
  imports: Injectable[];
}

export interface Definition extends Entity {
  exports: Injectable;
  imports: Injectable[];
}

export interface Analysis {
  injectables: Injectable[];
  definitions: Definition[];
  modules: Module[];
}

interface InternalDefinition extends Entity {
  exports: string;
  imports: string[];
}

interface InternalModule extends Entity {
  exports: string[];
  imports: string[];
}

function internalAnalysis(): Analysis {
  return { definitions: [], injectables: [], modules: [] };
}

function createDefinition(
  internal: InternalDefinition,
  injectables: Record<string, Injectable>
): Definition {
  const exports = injectables[internal.exports];
  const imports = internal.imports
    .map((imp) => injectables[imp])
    .filter(Boolean);
  const { name, pkg } = internal;

  return { name, pkg, exports, imports };
}

function createModule(
  internal: InternalModule,
  injectables: Record<string, Injectable>
): Module {
  const exports = internal.exports
    .map((imp) => injectables[imp])
    .filter(Boolean);
  const imports = internal.imports
    .map((imp) => injectables[imp])
    .filter(Boolean);
  const { name, pkg } = internal;

  return { name, pkg, exports, imports };
}

class Internal {
  injectables: Record<string, Injectable> = {};

  definitions: Record<string, InternalDefinition> = {};

  modules: Record<string, InternalModule> = {};

  to_analysis(): Analysis {
    // the components
    const injectables: Injectable[] = Object.keys(this.injectables).map(
      (key) => this.injectables[key]
    );
    const definitions: Definition[] = Object.keys(this.definitions).map((key) =>
      createDefinition(this.definitions[key], this.injectables)
    );
    const modules: Module[] = Object.keys(this.modules).map((key) =>
      createModule(this.modules[key], this.injectables)
    );
    // convert the injectables

    return { injectables, definitions, modules };
  }

  add_line(line: string): Internal {
    // split
    const tokens = line.trim().split('\t');
    const [action, key, name, pkg, ...data] = tokens;
    // handle
    if (action === 'injectable') {
      const [type] = data;
      this.injectables[key] = { name, pkg, type };
    } else if (action === 'definition') {
      // locate import and export
      const idxExport = data.indexOf('export');
      const idxImport = data.indexOf('import');
      // tokenize
      const exports = data[idxExport + 1];
      const imports = data.slice(idxImport + 1);
      this.definitions[key] = { name, pkg, imports, exports };
    } else if (action === 'module') {
      // locate import and export
      const idxExport = data.indexOf('export');
      const idxImport = data.indexOf('import');
      // tokenize
      const exports = data.slice(idxExport + 1, idxImport);
      const imports = data.slice(idxImport + 1);
      this.modules[key] = { name, pkg, imports, exports };
    }

    return this;
  }
}

export function analyze(): OperatorFunction<string, Analysis> {
  return pipe(
    reduce((acc: Internal | undefined, line: string) => {
      if (acc === undefined) {
        acc = new Internal();
      }
      return acc.add_line(line);
    }, undefined),
    map((acc) => (acc ? acc.to_analysis() : internalAnalysis()))
  );
}

/**
 * Generates the analysis
 *
 * @param aPython - name of the python exectuable
 *
 * @returns the analysis
 */
async function internalFindAnalysis(aPython: string): Promise<Analysis> {
  // local script
  const script = join(ASSET_ROOT, 'python', 'injectables.py');
  // dispatch
  return rxSpawn(aPython, [script])
    .pipe(
      filter(([type]) => type === SPAWN_OUTPUT_TYPE.STDOUT),
      map(([, line]) => line),
      analyze(),
      first()
    )
    .toPromise();
}

const INTERNAL_CACHE: Record<string, Promise<Analysis>> = {};

/**
 * Generates the analysis
 *
 * @param aPython - name of the python exectuable
 *
 * @returns the analysis
 */
export async function findAnalysis(
  aPython: string,
  refresh: boolean = false
): Promise<Analysis> {
  // check of cached result
  const cached = refresh ? undefined : INTERNAL_CACHE[aPython];
  if (cached) {
    return cached;
  }
  // update
  const updated = internalFindAnalysis(aPython);
  INTERNAL_CACHE[aPython] = updated;
  // ok
  return updated;
}
