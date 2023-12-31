import * as assert from "assert";
import {
  $$,
  isPrimitiveTypeName,
  isWrapperTypeName,
  getInnerType,
  setInnerType,
  isObject,
} from ".";

type Typed = object;

const _primitiveSchema = {
  id: "",
  name: "primitives",
  types: [
    { name: "Int" },
    { name: "Float" },
    { name: "String" },
    { name: "Boolean" },
    { name: "Void" },
  ],
};

// TODO: make this immutable? Yes please
// TODO: schema traversals that start on primitives are not supported
export default class SchemaTraversal {
  schema: any;
  primitiveSchema: any;
  imports: any;
  context: any;
  rootSchema: any;
  rootType: any;
  rootWrappers: any;

  constructor(schema, rootType: string | Typed = "Root") {
    this.schema = schema;
    this.primitiveSchema = _primitiveSchema;
    this.imports = schema.imports || [];

    // Temporarily set a context so that methods work
    this.context = [{ schema }];

    let rootTypeName;
    let wrappers;
    // console.log('ROOT TYPE', rootType);
    if (typeof rootType === "object") {
      const unwrapped = this._unwrapTyped(rootType);
      // console.log('UNWRAPPED', unwrapped);
      wrappers = unwrapped.wrappers;
      rootTypeName = unwrapped.innerType;
    } else {
      rootTypeName = rootType;
    }
    assert.equal(
      typeof rootTypeName,
      "string",
      "rootType must be a string or typed"
    );

    // console.log('ROOT TYPE NAME', rootTypeName);
    const { typeName, schema: rootSchema } =
      this._getTypeNameAndSchema(rootTypeName);
    const type = rootSchema.types.find((t) => t.name === typeName);

    if (type === undefined) {
      throw new Error(
        `Failed to find type "${typeName}" for traversal in the provided schema`
      );
    }

    // Keep track of this so that we can push the root again
    this.rootSchema = rootSchema;
    this.rootType = type;
    this.rootWrappers = wrappers;

    // Restart the context to the actual root
    this.context = [];
    this._pushRoot();
  }

  clone() {
    return Object.assign(Object.create(SchemaTraversal.prototype), {
      ...this,
      context: [...this.context],
    });
  }

  reset() {
    this.context = [];
    this._pushRoot();
  }

  getContext() {
    return this.context[this.context.length - 1];
  }

  getSchema() {
    return this.context[this.context.length - 1].schema;
  }

  getType() {
    return this.context[this.context.length - 1].type;
  }

  getTyped() {
    // TODO: HACK: Events don't have a type. Returning Ref for now
    const { schema, type = { name: "String" } } = this.getContext();
    let typeName;
    if (type.name.indexOf(":") < 0) {
      if (schema && schema !== this.schema && !isPrimitiveTypeName(type.name)) {
        typeName = schema.id + ":" + type.name;
      } else {
        typeName = type.name;
      }
    } else {
      typeName = type.name;
    }

    let result: any = { type: typeName };
    const wrappers = this.getWrappers();
    for (let i = wrappers.length - 1; i >= 0; --i) {
      result = { type: wrappers[i], ofType: result };
    }
    return result;
  }

  getScalarFields(filter: any = {}) {
    if (filter.fields === undefined) {
      filter.fields = true;
    }
    const { fields = [] } = this.getType();
    return [
      ...(filter.fields
        ? fields.filter((f) => isPrimitiveTypeName(getInnerType(f)))
        : []),
    ];
  }

  getTypedForParam(paramName) {
    const { schema } = this.getContext();
    const param = this.member.params.find((p) => p.name === paramName);
    const innerType = getInnerType(param);

    let typeName;
    if (innerType.indexOf(":") < 0 && schema && schema !== this.schema) {
      typeName = schema.id + ":" + innerType;
    } else {
      typeName = innerType;
    }

    // Wrap the inner type in its wrappers
    let result = JSON.parse(
      JSON.stringify({ type: param.type, ofType: param.ofType })
    );
    setInnerType(result, typeName);
    return result;
  }

  getParamsTypeAndSchema() {
    const { context } = this;
    if (context.length < 2) {
      // TODO: what to do here?
      return;
    }
    const { type, schema } = context[context.length - 2];
    const { member } = context[context.length - 1];
    if (type !== undefined && member !== undefined) {
      const typeName = `${type.name}_${member.name}_params`;
      // console.log('FINDING', typeName);
      // console.log(schema.types.map((t) => t.name));
      const paramsType = schema.types.find((t) => t.name === typeName);
      if (paramsType !== undefined) {
        return { type: paramsType, schema };
      }
    }
  }

  hasParams() {
    const member = this.member;
    if (!member) {
      return false;
    }
    return Boolean(member.params && member.params.length);
  }

  get fullTypeName() {
    const type = this.getType();
    return type && this.typePrefix + type.name;
  }

  get paramsFullTypeName() {
    const { type, schema } = this.getParamsTypeAndSchema();
    let prefix;
    if (schema !== this.schema && schema !== this.primitiveSchema) {
      prefix = schema.id + ":";
    } else {
      prefix = "";
    }
    return type && prefix + type.name;
  }

  get typePrefix() {
    const schema = this.getSchema();
    if (schema !== this.schema && schema !== this.primitiveSchema) {
      return schema.id + ":";
    }
    return "";
  }

  get type() {
    return this.context[this.context.length - 1].type;
  }

  get member() {
    return this.context[this.context.length - 1].member;
  }

  get memberKind() {
    return this.context[this.context.length - 1].memberKind;
  }

  // @deprecated use getContext or getSchema instead
  getCurrentSchema() {
    return this.context[this.context.length - 1].schema;
  }

  // @deprecated use getContext or getType instead
  getCurrentType() {
    return this.context[this.context.length - 1].type;
  }

  isList() {
    const { wrappers } = this.context[this.context.length - 1];
    return Boolean(wrappers && wrappers[0] === "List");
  }

  isRef() {
    const { wrappers } = this.context[this.context.length - 1];
    return Boolean(wrappers && wrappers[0] === "Ref");
  }

  // Gets the wrappers for this field's type. A potentially empty array of
  // "List" and "Ref", outermost first. With at most one "Ref" but possibly
  // multiple lists
  getWrappers() {
    return this.context[this.context.length - 1].wrappers || [];
  }

  get wrappers() {
    return this.context[this.context.length - 1].wrappers || [];
  }

  isScalar() {
    const type = this.getType();
    return type !== undefined && isPrimitiveTypeName(type.name);
  }

  isObject() {
    return !this.isScalar() && !this.isList();
  }

  getStateString() {
    return this.context.map((e) => e.name || "").join(".");
  }

  _getMemberAndKind(name) {
    const { type } = this.getContext();
    let typed;
    let memberKind;
    if (type.fields) {
      typed = type.fields.find((f) => f.name === name);
      memberKind = "field";
    }
    // if (typed === undefined && type.computedFields) {
    //   typed = type.computedFields.find((f) => f.name === name);
    //   memberKind = "computedField";
    // }
    if (typed === undefined && type.events) {
      typed = type.events.find((f) => f.name === name);
      // HACK: some older programs don't define a type for events. This is how
      // we make it backwards-compatible. Can be removed in the future
      if (typed && !typed.type) {
        typed.type = "Void";
      }
      memberKind = "event";
    }
    if (typed === undefined && type.actions) {
      typed = type.actions.find((f) => f.name === name);
      memberKind = "action";
    }
    return { typed, memberKind };
  }

  _getTypeNameAndSchema(rawTypeName?: string, context?) {
    const colon = rawTypeName.indexOf(":");
    let schema;
    let typeName;
    if (colon <= 0) {
      if (colon === 0) {
        rawTypeName = rawTypeName.substr(1);
      }
      if (isPrimitiveTypeName(rawTypeName)) {
        schema = this.primitiveSchema;
      } else {
        schema = context ? context.schema : this.getCurrentSchema();
      }
      typeName = rawTypeName;
    } else {
      const importName = rawTypeName.substr(0, colon);
      schema = this.imports.find(
        (i) => i.id === importName || i.name === importName
      );
      if (!schema) {
        throw new Error("Import not found in schema");
      }
      typeName = rawTypeName.substr(colon + 1);
    }

    return { schema, typeName };
  }

  _unwrapTyped(typed) {
    // Unwrap the inner type
    let wrappers = [];
    let innerType = typed.type;
    let ofType = typed.ofType;
    while (isWrapperTypeName(innerType)) {
      wrappers.push(innerType);
      if (typeof ofType === "string") {
        innerType = ofType;
        ofType = undefined;
      } else {
        innerType = ofType.type;
        ofType = ofType.ofType;
      }
    }

    if (typeof innerType === "object") {
      innerType = innerType.type;
    }
    assert.ok(!isWrapperTypeName(innerType), `Type wrappers require an ofType`);

    return { wrappers, innerType };
  }

  _getTypedInfo(typed?, context?) {
    const { wrappers, innerType } = this._unwrapTyped(typed);
    const { schema, typeName } = this._getTypeNameAndSchema(innerType, context);

    let type;
    if (isPrimitiveTypeName(typeName)) {
      type = { name: typeName };
    } else {
      type = schema.types.find((t) => t.name === typeName);
    }

    assert.ok(type, `Type "${typeName}" not found in current context`);

    return {
      // The schema where typed's type resides
      schema,
      // The innertype's type object
      type,
      // Type wrappers (i.e. List and Ref)
      wrappers,
      // Full type name including program version id
      innerType,
    };
  }

  // Enters the member in the current type with the provided name. Returns false
  // if there is no member with the provided name
  enterMember(name?, args?) {
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("Expected member name to be a non-empty string");
    }
    if (args && !isObject(args)) {
      throw new Error("Expected args to be an object");
    }
    const { typed, memberKind } = this._getMemberAndKind(name);
    if (!typed) {
      return false;
    }

    let info;
    info = this._getTypedInfo(typed);

    this.context.push({ memberKind, member: typed, args, ...info });
    return true;
  }

  _pushRoot() {
    this.context.push({
      isRoot: true,
      schema: this.rootSchema,
      type: this.rootType,
      wrappers: this.rootWrappers || [],
    });
  }

  enterRef(refOrStr) {
    const ref = $$(refOrStr);

    // We have to start from the root
    this._pushRoot();

    // Push all elements of the ref's
    for (let i = 0; i < ref.path.size; ++i) {
      const elem = ref.path.get(i);
      if (!this.enterMember(elem.name, elem.args)) {
        return false;
      }
    }

    return true;
  }

  get ref() {
    const { context } = this;
    let i;
    for (i = context.length - 1; i >= 0; --i) {
      if (context[i].isRoot) {
        break;
      }
    }

    let ref = $$(":");
    for (i += 1; i < context.length; ++i) {
      ref = ref.push(context[i].member.name, context[i].args);
    }
    return ref;
  }

  enterParam(name) {
    const { member } = this.getContext();
    if (!member) {
      return false;
    }

    let typed;
    for (let p of member.params) {
      if (p.name === name) {
        typed = p;
        break;
      }
    }

    if (!typed) {
      return false;
    }

    assert.ok(
      this.context.length >= 2,
      "Unexpected enter param before entering a member first"
    );
    const info = this._getTypedInfo(
      typed,
      this.context[this.context.length - 2]
    );

    this.context.push({ param: typed, ...info });
    return true;
  }

  pop() {
    return this.context.pop();
  }
}
