import I from "immutable";
import { RefParser } from "./refParser.js";

// Serializes the provided value into its literal ref version
function serializeValue(value: any, isGraphQL: boolean): string {
  if (value instanceof Ref) {
    if (isGraphQL) {
      return `"${value.toString().replace(/"/g, '\\"')}"`;
    }
    return `[${value}]`;
  } else if (typeof value === "string") {
    return `"${value}"`;
  }
  return `${value}`;
}

// An element in a ref's path
export class PathElem extends I.Record({ name: "", args: I.Map() }) {
  withArgs(args: any) {
    if (!I.Map.isMap(args)) {
      args = I.Map(args);
    }
    let newElem = this.set("args", args);

    // HACK: using the ref parser to validate for now but we should use a more
    // efficient method later
    $$(":" + newElem.toString());
    return newElem;
  }

  _toString(isGraphQL: boolean) {
    let result = this.name;
    if (this.args.size > 0) {
      result += `(${this.argsToString(isGraphQL)})`;
    }
    return result;
  }

  argsToString(isGraphQL: boolean) {
    return this.args
      .sortBy((value, key) => key)
      .map((value, key) => `${key}:${serializeValue(value, isGraphQL)}`)
      .join(",");
  }

  argsToGraphQLArg() {
    return this.argsToString(true);
  }

  toGraphQLArgs() {
    return this._toString(true);
  }

  toString() {
    return this._toString(false);
  }
}

// Ref to a graph node in Membrane. Implemented on immutable.js.
export class Ref extends I.Record({ program: "", path: I.List() }) {
  path: any;

  _ensureIndexInRange(i: number): void {
    if (i >= this.path.length || i < -this.path.size) {
      throw new Error("Path element index out of range");
    }
  }

  // Pretty prints this ref. Needed so that we can implement toGraphQLArgs in
  // terms of toString
  _toString(isGraphQL: boolean): string {
    return `${this.program}:${this.path
      .map((pathElem) => pathElem._toString(isGraphQL))
      .join(".")}`;
  }

  // Pretty prints this ref
  toString(): string {
    return this._toString(false);
  }

  // toJSON () {
  //   return { $ref: this.toString() };
  // }

  // Same as toString but refs are passed as strings instead of square brackets
  toGraphQLArgs(): string {
    return this._toString(true);
  }

  // get $ref() {
  //   return ':';
  //   // console.log('Getting ref');
  //   // return this._toString(false);
  // }

  is(other: any): boolean {
    return I.is(this, other);
  }

  isNull(): boolean {
    return this.program === "null";
  }

  clone(): never {
    throw new Error("Ref.clone() IS DEPRECATED");
  }

  static _validate(ref: any): void {
    // console.log(ref.toString());
    // Assuming $$ function exists for validation
    // $$(ref.toString());
  }

  // Returns the same ref but with a different program
  withProgram(name?: string): any {
    const result = this.set("program", name);
    Ref._validate(result);
    return result;
  }

  // Sets the program to the empty string
  withoutProgram() {
    return this.set("program", undefined);
  }

  // Sets the path to the empty list
  withoutPath() {
    return this.set("path", undefined);
  }

  // Returns the same ref as this one but with one of the  last args (or as
  // specified by pathElemIndex) replaced with the provided one
  withArg(name: string, value: any, pathElemIndex = -1) {
    this._ensureIndexInRange(pathElemIndex);
    let result: Ref;
    if (value === undefined) {
      result = this.deleteIn(["path", pathElemIndex, "args", name]);
    } else {
      result = this.setIn(["path", pathElemIndex, "args", name], value);
    }
    Ref._validate(result);
    return result;
  }

  // Returns the same ref as this one but with the last args (or as specified by
  // pathElemIndex) replaced with the provided ones
  withArgs(args: object, pathElemIndex = -1) {
    if (!I.Map.isMap(args)) {
      if (typeof args !== "object") {
        throw new Error("Arguments of ref can only be plain objects or maps");
      }
      args = I.Map(args);
    }
    this._ensureIndexInRange(pathElemIndex);
    const result = this.setIn(["path", pathElemIndex, "args"], I.Map(args));
    Ref._validate(result);
    return result;
  }

  withoutArgs() {
    if (this.path.size === 0) {
      return this;
    }
    return this.setIn(["path", -1, "args"], I.Map());
  }

  withPath(path) {
    const result = this.set("path", path);
    Ref._validate(result);
    return result;
  }

  // Returns the concatenation of the provided ref after this ref
  concat(other) {
    const result = this.set("path", this.path.concat(other.path));
    Ref._validate(result);
    return result;
  }

  // Returns the concatenation of this ref after the provided ref
  rebase(other) {
    const result = other.concat(this);
    Ref._validate(result);
    return result;
  }

  // Returns this reference as relative to another one:
  //   "a:b.c.d.e" relative to "a:b.c" with name "1" returns "1:d.e"
  relativeTo(other, otherName) {
    if (other.program !== this.program) {
      throw new Error(
        "Ref cannot be expressed as relative to ref that points to another program"
      );
    }
    const result = new Ref({
      program: otherName || other.program,
      path: this.path.skipWhile((value, index) => {
        const otherValue = other.path.get(index);
        if (I.is(value, otherValue)) {
          return true;
        }
        if (otherValue === undefined) {
          return false;
        }
        throw new Error("Ref cannot be expressed as relative to provided ref");
      }),
    });
    Ref._validate(result);
    return result;
  }

  // Whether this ref is a prefix of another one
  isPrefix(other) {
    if (this.program !== other.program) {
      return false;
    }

    return this.path.every((p1, i) => {
      const p2 = other.path.get(i);
      if (p2 === undefined) {
        return false;
      }
      let result = p1.name === p2.name;
      if (p1.args.size !== 0) {
        result = I.is(p1.args, p2.args);
      }
      return result;
    });
  }

  // Gets the last element in the path
  last() {
    return this.path.get(-1);
  }

  push(name, args) {
    const pathElem = new PathElem({ name, args: I.Map(args) });
    const result = this.updateIn(["path"], (p: any[]) => p.push(pathElem));
    Ref._validate(result);
    return result;
  }

  // Pops the last element in the path, if path is empty, returns the empty ref
  pop() {
    if (this.path.size) {
      return this.updateIn(["path"], (p: any[]) => p.pop());
    }
    return this.delete("program");
  }

  shift() {
    if (this.path.size) {
      return this.updateIn(["path"], (path: any[]) => path.shift());
    }
    return this.delete("program");
  }

  // Returns a JS object with the args at the provided ref
  argsAt(ref) {
    if (typeof ref === "string") {
      ref = $$(ref);
    }
    if (ref.path.size > this.path.size || ref.path.size === 0) {
      return {};
    }

    for (let i = 0; i < ref.path.size; ++i) {
      if (this.path.get(i).name !== ref.path.get(i).name) {
        // A provided path element does not match the ones in this ref
        return {};
      }
    }

    return this.path.get(ref.path.size - 1).args.toObject();
  }
}

// An empty ref
export const EMPTY_REF = new Ref();

// Creates a Ref object. The argument can be:
// - undefined (returns the ":" ref)
// - string
// - another ref
export function $$(r?: any) {
  let ast;

  if (r instanceof Ref) {
    return r;
  }
  // if (r === undefined || r === null) {
  //   throw new Error('Refs cannot be built from ' + r);
  // }
  const looksLikeRef =
    r &&
    I.Record.isRecord(r) &&
    typeof (r as any).program === "string" &&
    I.List.isList((r as any).path) &&
    r.toString;
  if (looksLikeRef) {
    ast = new RefParser(r.toString()).parse();
  } else if (typeof r === "string") {
    ast = new RefParser(r).parse();
  } else if (r && r.$ref && typeof r.$ref === "string") {
    ast = new RefParser(r.$ref).parse();
  } else {
    throw new Error(
      "Refs can only be constructed from another Ref, a string, or an object with a $ref property, got: " +
        (r === null ? "null" : typeof r)
    );
  }

  return refFromAst(ast);
}

// Creates a ref given a parsed string's AST
function refFromAst(ast) {
  const path = I.List(
    ast.path.value.map((pathElemAst) => {
      const args = {};

      for (let arg of pathElemAst.args.value) {
        if (arg.value.type === "ref") {
          args[arg.name.value] = refFromAst(arg.value.value);
        } else {
          args[arg.name.value] = arg.value.value;
        }
      }
      return new PathElem({
        name: pathElemAst.name.value,
        args: I.Map(args),
      });
    })
  );

  const program = ast.program.value;
  return new Ref({ program, path });
}
