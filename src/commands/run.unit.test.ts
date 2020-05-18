import { OutputChannel, ExtensionContext, window } from 'vscode';
import { getLpar } from '../utils/settings';
import { getActiveDocument, getRemoteFile } from './copy.utils';
import { maybeCopyFileToLpar } from '../utils/copy.file';
import { runTest, maybeRunTest } from '../utils/unit.tests';

export const createRunUnitTestCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // get some configs
  const lpar$ = getLpar();
  const uri$ = getActiveDocument();
  // locate the file
  const file$ = Promise.all([uri$, lpar$]).then(([uri, lpar]) =>
    getRemoteFile(uri, lpar, channel, context)
  );
  // update the remote file
  const copied$ = Promise.all([uri$, file$, lpar$]).then(([uri, file, lpar]) =>
    maybeCopyFileToLpar(uri, file, lpar, channel)
  );
  // execute the test
  const test$ = Promise.all([uri$, copied$, lpar$]).then(([uri, file, lpar]) =>
    maybeRunTest(uri, file, lpar, channel, context)
  );
  // show the result
  return test$.then((dstFile) =>
    dstFile
      ? window.showInformationMessage(`Ran test ${dstFile}.`)
      : window.showWarningMessage(`No test executed.`)
  );
};
