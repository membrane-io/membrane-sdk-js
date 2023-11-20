import * as Immutable from "immutable";
import * as util from "util";
import * as deepEqual from "deep-equal";
export const I = Immutable;
import debounce from "lodash.debounce";
export { debounce };

export { $$, Ref, PathElem } from "./ref";

export { RefParser } from "./refParser";

export { default as SchemaTraversal } from "./SchemaTraversal";
export { default as RefTraversal } from "./RefTraversal";

export {
  AssigningVisitor,
  ObjectTraversal,
  AsyncObjectTraversal,
  Visitor,
  SchemaVisitor,
  CloningVisitor,
  reconstructPath,
} from "./ObjectTraversal";

export { timeout, TimeoutError } from "promise-timeout";

export function isUuid(str: string): boolean {
  // temp, change to idId with length 24
  if (typeof str !== "string" || str.length !== 23) {
    return false;
  }
  return /^[a-z]{3}-[0-9a-f]{19}$/i.test(str);
}

export function isWrapperTypeName(typeName: string): boolean {
  return typeName === "Ref" || typeName === "List";
}

export function isRefTyped(typed: any): boolean {
  while (typed !== undefined && typed !== null) {
    if (typed === "Ref" || typed.type === "Ref") {
      return true;
    }
    typed = typed.ofType;
  }
  return false;
}

export function isPrimitiveTypeName(name: string): boolean {
  return (
    typeof name === "string" && /^(Int|Float|String|Boolean|Void|Json)$/.test(name)
  );
}

export function isValidIdentifier(name: string): boolean {
  return (
    typeof name === "string" &&
    /^[a-z][a-zA-Z0-9@]{0,63}$/.test(name) &&
    !/^(self|undefined|null|true|false)$/.test(name)
  );
}

export function isValidMemberName(name: string): boolean {
  return (
    typeof name === "string" &&
    /^[a-z][a-zA-Z0-9]{0,63}$/.test(name) &&
    !/^(undefined|null|true|false|perItem|perPage|forEach|forEachPage)$/.test(
      name
    )
  );
}

export function isValidTypeName(name: string): boolean {
  return typeof name === "string" && /^[A-Z_][_a-zA-Z0-9]{0,63}$/.test(name);
}

export function isValidUsername(name: string): boolean {
  return typeof name === "string" && /^[_a-zA-Z0-9]{3,24}$/.test(name);
}

export function isValidTypeIdentifier(name: string): boolean {
  if (typeof name !== "string") {
    return false;
  }
  const colon = name.indexOf(":");
  if (colon >= 0) {
    const programName = name.substr(0, colon);
    return (
      (isValidProgramName(programName) || isUuid(programName)) &&
      isValidTypeName(name.substr(colon + 1))
    );
  }
  return isValidTypeName(name);
}

export function isValidProgramName(name: string): boolean {
  if (typeof name !== "string") {
    return false;
  }
  // Must be less than the length of a uuid to prevent clashes
  if (name.length > 35) {
    return false;
  }
  return isValidIdentifier(name);
}

export function isValidEnvironmentName(name: string): boolean {
  if (typeof name !== "string") {
    return false;
  }
  // Must be less than the length of a uuid to prevent clashes
  if (name.length > 64) {
    return false;
  }
  return /^[A-Z_][A-Z_0-9]*$/.test(name);
}

export function isValidDependencyName(name: string): boolean {
  // Dependencies can be any identifier except for root because that's already
  // taken by the program itself and would be confusing
  if (name === "root") {
    return false;
  }
  return isValidIdentifier(name);
}
export function isValidEndpointName(name: string): boolean {
  return isValidIdentifier(name);
}

// Tags must be of the form xx-xxx-xxxxx-xx (i.e. lowecase separated by dashes)
export function isValidTagName(name: string): boolean {
  return (
    typeof name === "string" &&
    name.length <= 35 &&
    /^[a-z](-?[a-z0-9]+)*$/.test(name) &&
    !/^(self|undefined|null|true|false)$/.test(name)
  );
}

export function isImplicitTypeName(typeName: string): boolean {
  return typeName.endsWith("_params");
}

export function isObject(o: any): boolean {
  return o && typeof o === "object" && !Array.isArray(o);
}

export function isArray(o: any): boolean {
  return Array.isArray(o);
}

// Filter out a list of keys from an object or elements from an array. Always
// returns a new shallow-copied version of the input.
export function without(object, ...toExclude) {
  if (object === null || object === undefined) {
    return object;
  }
  if (isArray(object)) {
    const result = [];
    for (let e of object) {
      if (toExclude.indexOf(e) < 0) {
        result.push(e);
      }
    }
    return result;
  } else if (isObject(object)) {
    const result = {};
    const keys = Object.keys(object);
    for (let key of keys) {
      if (toExclude.indexOf(key) < 0) {
        result[key] = object[key];
      }
    }
    return result;
  }
  throw new Error('Invalid type provided to "without"');
}

// Returns a deep clone of the provided object
export function deepClone(object) {
  const t = typeof object;
  if (
    object === null ||
    t === "string" ||
    t === "number" ||
    t === "boolean" ||
    t === "undefined"
  ) {
    return object;
  }

  let result;
  if (object instanceof Date) {
    result = new Date(object.getTime());
  } else if (isObject(object)) {
    result = {};
    let keys = Object.keys(object);
    for (let key of keys) {
      result[key] = deepClone(object[key]);
    }
  } else if (isArray(object)) {
    result = [];
    for (let i = 0; i < object.length; i++) {
      result[i] = deepClone(object[i]);
    }
  }

  if (!result) {
    throw new Error(`Unsupported type in util.deepClone "${t}"`);
  }
  return result;
}

// Returns a deep clone of the provided object
const deepEqualOpts = { strict: true };
export function deepEquals(a, b) {
  return deepEqual.default(a, b, deepEqualOpts);
}

export function typedEquals(a, b) {
  return a.type === b.type && deepEquals(a.ofType, b.ofType);
}

// // Turns an array into an object
// export function arrayToObject(arr, getKey = (e) => e.name, getValue = (e) => e) {
//   const result = {};
//   for (let e of arr) {
//     result[getKey(e)] = getValue(e);
//   }
//   return result;
// }

export function shallowEquals(a, b) {
  if (a === b) {
    return true;
  }

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    return false;
  }

  if (isArray(a) && isArray(b)) {
    return arrayEquals(a, b);
  }

  if (typeA !== "object") {
    return false;
  }

  if (a instanceof Date) {
    if (!(b instanceof Date)) {
      return false;
    }
    return a.getTime() === b.getTime();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  const bHasOwnProperty = Object.prototype.hasOwnProperty.bind(b);

  // Test for A's keys different from B.
  for (let idx = 0; idx < keysA.length; idx++) {
    const key = keysA[idx];
    if (!bHasOwnProperty(key)) {
      return false;
    }

    const valueA = a[key];
    const valueB = b[key];

    if (valueA instanceof Date) {
      if (!(valueB instanceof Date)) {
        return false;
      }
      if (valueA.getTime() !== valueB.getTime()) {
        return false;
      }
    } else if (valueA !== valueB) {
      return false;
    }
  }

  return true;
}

// Gets the inner type of the provided typed (i.e. the type that remains after
// removing any Ref/List)
export function getInnerType(typed) {
  let innerType = typed.type;
  let ofType = typed.ofType;
  let isRef = false;
  while (innerType === "Ref" || innerType === "List") {
    if (innerType === "Ref") {
      if (isRef) {
        throw new Error("Declaring a Ref of a Ref is invalid");
      }
      isRef = true;
    }
    if (typeof ofType === "string") {
      innerType = ofType;
    } else {
      innerType = ofType.type;
      ofType = ofType.ofType;
    }
  }
  return innerType;
}

// Sets the inner type of the provided typed (i.e. the type that remains after
// removing any Ref/List)
export function setInnerType(typed, innerType: string) {
  let o = typed;
  let ofType = o.ofType;
  let isRef = false;
  while (o.type === "Ref" || o.type === "List") {
    if (!o.ofType) {
      throw new Error("A wrapper type must define an ofType");
    }
    if (o.type === "Ref") {
      if (isRef) {
        throw new Error("Declaring a Ref of a Ref is invalid");
      }
      isRef = true;
    }
    if (typeof ofType !== "object") {
      o.ofType = innerType;
      return;
    }
    o = ofType;
    ofType = o.ofType;
  }
  o.type = innerType;
  return typed;
}

// Given a type that might have a program version id prefix, returns an object
// with the program version and the type name.
export function parseTypeName(typeName) {
  const colon = typeName.indexOf(":");
  let programVersionId;
  if (colon >= 0) {
    programVersionId = typeName.substr(0, colon);
    typeName = typeName.substr(colon + 1);
  } else {
    programVersionId = "";
  }
  return { programVersionId, typeName };
}

// Tracing
let traceLevel = 0;
export const traceBegin = (...args) => {
  return;
  const str =
    "> begin " +
    args.map((a) => (typeof a === "string" ? a : util.inspect(a))).join(" ");
  console.log(indent(str, traceLevel));
  traceLevel++;
};
export const trace = (...args) => {
  return;
  const str =
    "> " +
    args.map((a) => (typeof a === "string" ? a : util.inspect(a))).join(" ");
  console.log(indent(str, traceLevel));
};
export const traceEnd = (...args) => {
  return;
  traceLevel--;
  const str =
    "> end " +
    args.map((a) => (typeof a === "string" ? a : util.inspect(a))).join(" ");
  console.log(indent(str, traceLevel));
};

// Shallow equality for arrays
export function arrayEquals(a, b) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] instanceof Date) {
      if (!(b[i] instanceof Date)) {
        return false;
      }
      if (a[i].getTime() !== b[i].getTime()) {
        return false;
      }
    } else if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// Generates a random hex chars
export function randomHex(length = 16) {
  let result = "";
  while (result.length < length) {
    result += Math.floor(Math.random() * 1e16).toString(16);
  }
  return result.substr(0, length);
}

// Identify function
export const identity = (x) => x;

// Maps the provided array of keys into an object with the same keys where the
// value for each key is determined by a function of it
export function mapKeys(keys, fn = identity) {
  const result = {};
  for (let key of keys) {
    result[key] = fn(key);
  }
}

// Returns a function that will keep track of "in-flight" promises and return
// one if available preventing multiple calls from doing the same thing
// simultaneously. Fn must accept a key as the first arg and return a promise.
// TODO: rename to memoize and add a "maxAge" param
export function sharedResult(fn) {
  const inFlightPromises = {};
  return (key, ...args) => {
    if (inFlightPromises[key] === undefined) {
      const remove = () => {
        process.nextTick(() => delete inFlightPromises[key]);
      };
      inFlightPromises[key] = fn(key, ...args).then((result) => {
        remove();
        return result;
      }, remove);
    } else {
      console.log("USING SHARED PROMISE");
    }
    return inFlightPromises[key];
  };
}

// Returns whether the provided object has keys that are not in the array of
// valid keys
// TODO: this is bad validation. Use a schema validation library like tcomb
export function hasUnknownKeys(object, valid) {
  const keys = Object.keys(object);
  return keys.some((k) => !valid.includes(k));
}

// Calls delete on all properties that exist in the object and whose value is
// undefined. Some libraries (e.g. rethinkdb) choke if you pass them an
// undefined prop
export function withoutUndefined(o) {
  if (!isObject(o)) {
    throw new Error("Expected valid object in withoutUndefinedProps");
  }
  const keys = Object.keys(o);
  for (let key of keys) {
    if (o[key] === undefined) {
      delete o[key];
    }
  }
}

// Promise that resolves at the provided number of seconds (uses setTimeout)
export function sleep(secs) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), secs * 1000);
  });
}

export function indent(text, amount, indenter = " ", suffix = "") {
  const pad = indenter.repeat(amount);
  const tokens = text.split("\n");
  return tokens
    .map((line) => {
      if (line.length > 0) {
        return pad + line + suffix;
      }
      return "";
    })
    .join("\n");
}

// Recursively freezes an object
export function deepFreeze(o) {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach((prop) => {
    // eslint-disable-next-line no-prototype-builtins
    if (
      o.hasOwnProperty(prop) &&
      o[prop] !== null &&
      (typeof o[prop] === "object" || typeof o[prop] === "function") &&
      !Object.isFrozen(o[prop])
    ) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}
