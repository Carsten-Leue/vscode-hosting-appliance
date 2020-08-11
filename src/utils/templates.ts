import { compile, create } from 'handlebars';
import { Observable, UnaryFunction } from 'rxjs';
import { map, mergeMap, shareReplay } from 'rxjs/operators';

import { createFileDescriptor, FileDescriptor, rxReadDir } from './file';

/**
 * Type definition on the handlebars template function that transforms a context into a markup string
 */
export type TemplateType = ReturnType<typeof compile>;
/**
 * Type definition on the handlebars API
 */
export type HandlebarsType = ReturnType<typeof create>;

/**
 * Representation of a file descriptor with templates for both the file name
 * and the file content.
 */
export type TemplateDescriptor = [TemplateType, TemplateType];

/**
 * Construct a new handlebars instance
 *
 * @returns the handlebars instance
 */
function createHandlebars(): HandlebarsType {
  // the instance
  const handlebars = create();
  // ok
  return handlebars;
}

/**
 * Constructs a handlebars compiler
 *
 * @param aHandlebars - optionally a handlebars instance
 * @returns the compiler
 */
export function createCompiler(
  aHandlebars?: HandlebarsType
): UnaryFunction<string, TemplateType> {
  // the instance
  const hbs = aHandlebars || createHandlebars();
  // compile the value
  return (aValue: string) => hbs.compile(aValue);
}

/**
 * Reads a list of files and interprets them as templates, both in the filename and the
 * content.
 *
 * @param aDir - directory to start in
 * @param aHandlebars - optionally the handlebars instance
 *
 * @returns the compiled templates
 */
export function rxReadTemplates(
  aDir: string,
  aHandlebars?: HandlebarsType
): Observable<TemplateDescriptor> {
  // compile the value
  const cmp = createCompiler(aHandlebars);
  // iterate and compile
  return rxReadDir(aDir).pipe(
    map(([name, data]) => createFileDescriptor(name, data.toString())),
    map(([name, data]) => [cmp(name), cmp(data)])
  );
}

function applyTemplates(
  aTemp$: Observable<TemplateDescriptor>,
  aCtx: any
): Observable<FileDescriptor<string>> {
  return aTemp$.pipe(
    map(([nameTmp, dataTmp]) => [nameTmp(aCtx), dataTmp(aCtx)])
  );
}

/**
 * Applies templates to a set of contexts
 *
 * @param aCtx$  - the set of contexts
 * @param aTemp$ - the set of templates
 *
 * @returns the final data stream
 */
export function rxApplyTemplates(
  aCtx$: Observable<any>,
  aTemp$: Observable<TemplateDescriptor>
): Observable<FileDescriptor<string>> {
  // share
  const temp$ = aTemp$.pipe(shareReplay());
  // combine
  return aCtx$.pipe(mergeMap((ctx) => applyTemplates(temp$, ctx)));
}
