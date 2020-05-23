import { Observable, UnaryFunction } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { QuickPickItem, window } from 'vscode';

import {
  getRepositories,
  RepositoriesDefShort,
  RepositoryDefShort,
} from './hosting.appliance';
import { getHostnameFromSshConfig } from './ssh';

export interface RepositoryPick extends QuickPickItem {
  id: string;
  def: RepositoryDefShort;
}

function createRepositoryPick(
  aId: string,
  aDef: RepositoryDefShort
): RepositoryPick {
  return {
    id: aId,
    def: aDef,
    label: aId,
    description: aDef.repository_name,
    detail: aDef.runtime,
  };
}

function createRepositoryPicks(aReps: RepositoriesDefShort): RepositoryPick[] {
  return Object.keys(aReps).reduce(
    (aDst: RepositoryPick[], aId: string) => [
      ...aDst,
      createRepositoryPick(aId, aReps[aId]),
    ],
    []
  );
}

export function selectRepository(
  aLpar: string,
  aAuth: UnaryFunction<string, Observable<string>>
): Thenable<RepositoryPick | undefined> {
  // resolve the lpar to a hostname
  const hostname$ = getHostnameFromSshConfig(aLpar);
  // the items
  const reps$ = hostname$
    .pipe(switchMap((hostname) => getRepositories(hostname, aAuth)))
    .pipe(first(), map(createRepositoryPicks))
    .toPromise();
  // show the beast
  const log = `Loading repositories for ${aLpar} ...`;
  window.setStatusBarMessage(log, reps$);
  // show the pick
  return window.showQuickPick(reps$, { placeHolder: 'Repository' });
}
