import { $$, SchemaTraversal } from ".";
import * as assert from "assert";

type Typed = object;

// Traverses a schema using a ref
export default class RefTraversal {
  _ref: any;
  _index: number;
  _schemaTraversal: any;

  constructor(ref?, schema?, rootType?: string | Typed) {
    assert.ok(ref, "Invalid ref provided to RefTraversal constructor");
    assert.ok(schema, "Invalid schema provided to RefTraversal constructor");
    // assert.ok(!rootType || typeof rootType === 'string', 'Invalid root type provided to RefTraversal constructor');

    ref = $$(ref);
    this._ref = ref;
    this._index = -1;

    if (rootType) {
      this._schemaTraversal = new SchemaTraversal(schema, rootType);
    } else if (ref.program) {
      const refSchema = schema.imports.find((i) => i.name === ref.program);
      this._schemaTraversal = new SchemaTraversal(
        schema,
        refSchema.id + ":Root"
      );
    } else {
      this._schemaTraversal = new SchemaTraversal(schema);
    }
  }

  getContext() {
    return this;
  }

  // Traverse the whole ref
  toEnd = () => {
    while (this.next()) {
      // Nothing
    }
    return this;
  };

  // Traverses one more path element
  next = () => {
    if (this._index >= this._ref.path.size - 1) {
      return false;
    }
    this._index++;

    const { name: parentTypeName } = this.type;
    const { name } = this._ref.path.get(this._index);
    if (!this._schemaTraversal.enterMember(name)) {
      throw new Error(
        `Path element "${name}" is not a member of type "${parentTypeName}"`
      );
    }

    return true;
  };

  // TODO: this is not being used but if you want to use it feel free to
  // uncomment and fix
  // // Returns a ref traversal to an argument of the current path element
  // getArgTraversal(name) {
  //   const { args } = this;
  //   const param = this.member.params.find((f) => f.name === name);
  //   if (param === undefined) {
  //     throw new Error('Arg does not exist in the schema');
  //   }
  //   const argValue = this.args.get(name);
  //   if (argValue === undefined) {
  //     throw new Error('Arg does not exist in the current path element');
  //   }
  //   console.log('ARG', argValue);
  //   console.log('PARAM', param);
  //   if (!(argValue instanceof Ref)) {
  //     throw new Error('Only Ref arguments can be used');
  //   }
  //
  //   // const schema = this.schema;
  //   // if (schema !== this._rootSchema) {
  //   //   const typed = JSON.parse(JSON.stringify({ type: param.type, ofType: param.ofType }));
  //   //   setInnerType(typed, getInnerType(typed));
  //   // }
  //   return new RefTraversal(argValue, this._rootSchema, this.schemaTraversal.getTypedForParam(name));
  // }

  // Information about the current position within the ref and schema
  get pathElem() {
    return this._ref.path.get(this._index);
  }
  get ref() {
    return this._ref.withPath(this._ref.path.slice(0, this._index + 1));
  }
  get name() {
    return this.pathElem && this.pathElem.name;
  }
  get args() {
    return this.pathElem && this.pathElem.args;
  }
  get type() {
    return this._schemaTraversal.getCurrentType();
  }
  // get paramsType() { return this._schemaTraversal.getParamsType(); }
  get schema() {
    return this._schemaTraversal.getCurrentSchema();
  }
  get isRef() {
    return this._schemaTraversal.isRef();
  }
  get isList() {
    return this._schemaTraversal.isList();
  }
  get wrappers() {
    return this._schemaTraversal.getWrappers();
  }
  get typed() {
    return this._schemaTraversal.getTyped();
  }
  get fullTypeName() {
    return this._schemaTraversal.fullTypeName;
  }
  get paramsFullTypeName() {
    return this._schemaTraversal.paramsFullTypeName;
  }
  get member() {
    return this._schemaTraversal.member;
  }
  get schemaTraversal() {
    return this._schemaTraversal.clone();
  }
}
