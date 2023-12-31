import { Ref, $$, I, SchemaTraversal, isObject, isArray } from ".";
import assert from "assert";

// Objects that want to be treated as Refs can set this property to true
const kRefEquivalentKey = Symbol.for("RefEquivalent");

export function reconstructPath(path: any) {
  let keys = [];
  let p = path;
  while (p) {
    keys.push(p.key);
    p = p.parent;
  }
  return keys.reverse().join(".");
}

// TODO: use symbols
const traversalCommands = {
  skip: (value) => ({ $$skip: true, $$use: value }),
  use: (value) => ({ $$use: value }),
};

// Traverses an object
export class ObjectTraversal {
  object: object;

  constructor(object?) {
    this.object = object;
  }

  traverse = (visitor) => {
    if (visitor && visitor.begin) {
      visitor.begin();
    }
    this._traverseRecursively(visitor, this.object, null);
    if (visitor && visitor.end) {
      visitor.end();
    }
  };

  _traverseRecursively = (visitor, object, path, skipChildren = false) => {
    let command;
    const context = {};
    if (visitor && visitor.enter) {
      command = visitor.enter(object, path, traversalCommands, context);
    }

    skipChildren =
      skipChildren ||
      object instanceof Ref ||
      (command && command.$$skip) ||
      (command && command.$$use !== undefined);

    if (!skipChildren) {
      // Traverse children
      if (isObject(object)) {
        const keys = Object.keys(object);
        for (let key of keys) {
          this._traverseRecursively(visitor, object[key], {
            key,
            parent: path,
          });
        }
      } else if (isArray(object)) {
        for (let key = 0; key < object.length; ++key) {
          this._traverseRecursively(visitor, object[key], {
            key,
            parent: path,
          });
        }
      }
    }

    if (visitor && visitor.exit) {
      visitor.exit(object, path, {}, context);
    }

    if (command && command.$$use !== undefined) {
      // The visitor decided to traverse a different object at this path
      // TODO the path object now contains more than just the path, it also
      // contains the previous value if a value is replaced via the "use"
      // command. Rename to "info"?
      path.prevValue = object;
      this._traverseRecursively(
        visitor,
        command.$$use,
        path,
        Boolean(command.$$skip)
      );
    }
  };
}

// Traverses an object. The difference between this class and ObjectTraversal is
// that visitors can return promises to traverse the object asynchronously
export class AsyncObjectTraversal {
  object: object;
  constructor(object?) {
    this.object = object;
  }

  traverse = async (visitor) => {
    if (visitor && visitor.begin) {
      await visitor.begin();
    }
    await this._traverseRecursively(visitor, this.object, null);
    if (visitor && visitor.end) {
      await visitor.end();
    }
  };

  _traverseRecursively = async (
    visitor,
    object,
    path,
    skipChildren = false
  ) => {
    let command;
    const context = {};
    if (visitor && visitor.enter) {
      command = await visitor.enter(object, path, traversalCommands, context);
    }

    skipChildren =
      skipChildren ||
      object instanceof Ref ||
      (command && command.$$skip) ||
      (command && command.$$use !== undefined);

    if (!skipChildren) {
      // Traverse children
      if (isObject(object)) {
        const keys = Object.keys(object);
        for (let key of keys) {
          await this._traverseRecursively(visitor, object[key], {
            key,
            parent: path,
          });
        }
      } else if (isArray(object)) {
        for (let key = 0; key < object.length; ++key) {
          await this._traverseRecursively(visitor, object[key], {
            key,
            parent: path,
          });
        }
      }
    }

    if (visitor && visitor.exit) {
      await visitor.exit(object, path, {}, context);
    }

    if (command && command.$$use !== undefined) {
      // The visitor decided to traverse a different object at this path
      path.prevValue = object;
      return this._traverseRecursively(
        visitor,
        command.$$use,
        path,
        Boolean(command.$$skip)
      );
    }
  };
}

// Pass through visitor. Other visitors can inherit from this one and override
// some/all of the methods
export class Visitor {
  visitor: any;

  constructor(visitor) {
    this.visitor = visitor;
  }

  begin(...args) {
    if (this.visitor && this.visitor.begin) {
      this.visitor.begin(...args);
    }
  }

  end(...args) {
    if (this.visitor && this.visitor.end) {
      this.visitor.end(...args);
    }
  }

  enter(...args) {
    if (this.visitor && this.visitor.enter) {
      this.visitor.enter(...args);
    }
  }

  exit(...args) {
    if (this.visitor && this.visitor.exit) {
      this.visitor.exit(...args);
    }
  }
}

// Visits an object while checking that it matches a schema. For every node, it
// calls the visitor function which can replace the node, skip it, etc.
export class SchemaVisitor {
  visitor: any;
  schemaTraversal: any;
  initialSchemaTraversal: any;
  stack: any;
  skipNextExit: any;
  allowResolvedRefs: any;

  constructor(schemaTraversal?, visitor?, options?) {
    // You can also pass the the schema
    if (!(schemaTraversal instanceof SchemaTraversal)) {
      schemaTraversal = new SchemaTraversal(schemaTraversal);
    }
    this.visitor = visitor;
    this.initialSchemaTraversal = schemaTraversal;

    // Whether to allow ref fields to have a value instead of a Ref. This
    // happens when traversing a query result after running subqueries
    this.allowResolvedRefs = (options && options.allowResolvedRefs) || false;
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  begin() {
    this.skipNextExit = false;
    this.schemaTraversal = this.initialSchemaTraversal.clone();
    this.stack = [{ wrappers: [] }];
    if (this.visitor && this.visitor.begin) {
      this.visitor.begin();
    }
  }

  end() {
    if (this.visitor && this.visitor.end) {
      this.visitor.end();
    }
  }

  enter(object, path, commands, context) {
    const key = path && path.key;
    let { wrappers } = this.top();
    const inList = wrappers[0] === "List";

    if (inList) {
      // We're traversing a list so there's no need to push another member in
      // the schema traversal, i.e. we're traversing a wrapper
      wrappers = wrappers.slice(1);
    } else {
      if (key && !this.schemaTraversal.enterMember(key)) {
        const pathStr = reconstructPath(path.parent);
        const typeStr = (this.schemaTraversal.type || { name: "unknown type" })
          .name;
        throw new Error(
          `SchemaVisitor: Member "${key}" at path "${pathStr}" (${typeStr}) not found in schema`
        );
      }

      wrappers = this.schemaTraversal.getWrappers();
    }
    this.stack.push({ wrappers });

    const isList = wrappers[0] === "List";
    const isRef = wrappers[0] === "Ref";

    // If this is a JSON ref, replace it with an actual Ref and try again. Also,
    // if this is a ref-wrapped field turn the value which should be a string or
    // json ref into a Ref
    const isRefEquivalent = object && object[kRefEquivalentKey] === true;
    const isJsonRef = object && typeof object.$ref === "string";
    if (isJsonRef && !isRefEquivalent) {
      this.skipNextExit = true;
      return commands.use($$(object));
    }

    // Check that the type of the object matches the schema
    const type = this.schemaTraversal.getCurrentType();
    const isRefValue = object instanceof Ref || isRefEquivalent;
    if (object !== null && object !== undefined) {
      if (isRef) {
        if (!isRefValue && !this.allowResolvedRefs) {
          throw new Error(
            `SchemaVisitor: Expected ref at path "${reconstructPath(path)}"`
          );
        }
      }
      if (!isRefValue) {
        // assert.ok(!isRef || this.allowResolvedRefs);
        if (isList) {
          if (!isArray(object)) {
            throw new Error(
              `SchemaVisitor: Expected array at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (type.name === "Void" && !this.allowResolvedRefs) {
          if (object !== undefined) {
            throw new Error(
              `SchemaVisitor: Expected undefined (Void) at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (type.name === "Int") {
          if (typeof object !== "number") {
            throw new Error(
              `SchemaVisitor: Expected number at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (type.name === "Float") {
          if (typeof object !== "number") {
            throw new Error(
              `SchemaVisitor: Expected number at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (type.name === "Boolean") {
          if (typeof object !== "boolean") {
            throw new Error(
              `SchemaVisitor: Expected boolean at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (type.name === "String") {
          if (typeof object !== "string") {
            throw new Error(
              `SchemaVisitor: Expected string at path "${reconstructPath(
                path
              )}". Got "${typeof object}"`
            );
          }
        } else if (!isObject(object)) {
          throw new Error(
            `SchemaVisitor: Expected object at path "${reconstructPath(
              path
            )}" (of type ${type.name}). Got ${typeof object}`
          );
        }
      }
    }

    // Enhance the context with type info
    context.type = this.schemaTraversal.getType();
    context.schema = this.schemaTraversal.getSchema();
    context.wrappers = this.schemaTraversal.getWrappers();

    // Forward the enter call to the nested visitor
    if (this.visitor && this.visitor.enter) {
      return this.visitor.enter(object, path, commands, context);
    }
  }

  exit(object, path, commands, context) {
    this.stack.pop();
    const { wrappers } = this.top();
    if (wrappers.length === 0 || wrappers[0] !== "List") {
      this.schemaTraversal.pop();
    }

    // Forward the exit call to the nested visitor
    if (!this.skipNextExit && this.visitor && this.visitor.exit) {
      this.visitor.exit(object, path, commands, context);
    }
    this.skipNextExit = false;
  }
}

export class CloningVisitor {
  visitor: any;
  stack: any[];
  result: any;

  constructor(visitor?: any) {
    this.result = null;
    this.visitor = visitor;
  }

  begin = () => {
    this.stack = [this];
    if (this.visitor && this.visitor.begin) {
      this.visitor.begin();
    }
  };

  end() {
    if (this.visitor && this.visitor.end) {
      this.visitor.end();
    }
  }

  enter(object, path, commands, context) {
    const parent = this.stack[this.stack.length - 1];

    let copy;
    if (I.isImmutable(object)) {
      // There's no need to create a copy
      copy = object;
    } else if (isArray(object)) {
      copy = [];
    } else if (object === null) {
      copy = null;
    } else if (typeof object === "object") {
      copy = {};
      if (Object.getPrototypeOf(object) !== Object.prototype) {
        Object.setPrototypeOf(copy, Object.getPrototypeOf(object));
      }
    } else {
      copy = object;
    }

    const command =
      this.visitor && this.visitor.enter(object, path, commands, context);
    if (!I.isImmutable(parent)) {
      if (path === null) {
        parent.result = copy;
      } else {
        parent[path.key] = copy;
      }
    }

    this.stack.push(copy);
    return command;
  }

  exit(object, path, commands, context) {
    this.stack.pop();
    if (this.visitor && this.visitor.exit) {
      this.visitor.exit(object, path, commands, context);
    }
  }
}

export class AssigningVisitor {
  visitor: any;
  stack: any[];

  constructor(visitor?: any) {
    this.visitor = visitor;
  }

  begin = () => {
    this.stack = [];
    if (this.visitor && this.visitor.begin) {
      this.visitor.begin();
    }
  };

  end() {
    if (this.visitor && this.visitor.end) {
      this.visitor.end();
    }
  }

  enter(object, path, commands, context) {
    this.stack.push(object);
    return this.visitor && this.visitor.enter(object, path, commands, context);
  }

  exit(object, path, commands, context) {
    this.stack.pop();

    const parent = this.stack[this.stack.length - 1];
    if (path) {
      // eslint-disable-next-line no-prototype-builtins
      if (path.hasOwnProperty("prevValue")) {
        parent[path.key] = object;
      }
    }

    if (this.visitor && this.visitor.exit) {
      this.visitor.exit(object, path, commands, context);
    }
  }
}
