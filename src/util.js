import { Ref, dbService as db } from '@ayva/ayva-common';

export async function measure(tag: string, promise: Promise<void>) {
  console.time(`[ ${tag} ]`);
  let result = await promise;
  console.timeEnd(`[ ${tag} ]`);
  return result;
}

let _instances;
function loadInstances(userId) {
  if (_instances === undefined) {
    _instances = db.run(db.programInstance.filter({ userId, status: 'running' })
      .eqJoin((x) => x('programVersionId'), db.programVersion)
      .eqJoin((x) => x('right')('programId'), db.program)
      .coerceTo('array'));
  }
  return _instances;
}

export async function getProgramInstances(userId: string, name : ?string= null) : Promise<Array<Object>> {
  let instances = (await loadInstances(userId))
    .map((i) => ({
      programInstance: i.left.left,
      programVersion: i.left.right,
      program: i.right,
    }));

  // Optionally find the programs with the provided id/name
  if (typeof name === 'string') {
    instances = instances.filter((i) =>
      i.programInstance.id.startsWith(name) ||
      i.programInstance.alias.startsWith(name) ||
      i.programVersion.id.startsWith(name) ||
      i.program.id.startsWith(name) ||
      i.program.name.startsWith(name)
    );
  }
  return instances;
}

export async function normalizeRef(userId: string, refObj: Ref) {
  const matches = await getProgramInstances(userId, refObj.program);
  if (matches.length === 0) {
    throw new Error('Program instance not found: ' + refObj.program);
  } else if (matches.length > 1) {
    throw new Error('Ambiguous program instance: ' + refObj.program);
  }

  const result = refObj.cloneWithProgram(matches[0].programInstance.id);
  for (let e of result.path) {
    const keys = Object.keys(e.args);
    for (let key of keys) {
      const arg = e.args[key];
      e.args[key] = arg instanceof Ref ? (await normalizeRef(userId, arg)) : arg;
    }
  }
  return result;
}

// function measureBegin(tag) { console.time(`[ ${tag} ]`); }
// function measureEnd(tag) { console.timeEnd(`[ ${tag} ]`); }

