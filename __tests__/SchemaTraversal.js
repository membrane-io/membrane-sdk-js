import {
  I,
  $$,
  SchemaTraversal,
  _primitiveSchema,
} from '../';

import schema from '../resources/testSchema';

describe('SchemaTraversal', () => {
  describe('constructed with type name', () => {
    it('accepts a type name from the main schema', () => {
      const t1 = new SchemaTraversal(schema, 'OwnThing');
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema,
        type: schema.types.find((t) => t.name === 'OwnThing'),
        wrappers: [],
      });
    })

    it('accepts a type name from an imported schema by id', () => {
      const t1 = new SchemaTraversal(schema, '00000000-0000-1000-8000-000000000000:Thing');
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: schema.imports[0],
        type: schema.imports[0].types.find((t) => t.name === 'Thing'),
        wrappers: [],
      });
    })

    it('accepts a type name from an imported schema by name', () => {
      const t1 = new SchemaTraversal(schema, 'test:Thing');
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: schema.imports[0],
        type: schema.imports[0].types.find((t) => t.name === 'Thing'),
        wrappers: [],
      });
    })
  })

  describe('constructed with typed', () => {
    it('accepts a plain type from the main schema', () => {
      const t1 = new SchemaTraversal(schema, { type: 'OwnThing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema,
        type: schema.types.find((t) => t.name === 'OwnThing'),
        wrappers: [],
      });
    })

    it('accepts a plain type from an imported schema', () => {
      const t1 = new SchemaTraversal(schema, { type: '00000000-0000-1000-8000-000000000000:Thing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: schema.imports[0],
        type: schema.imports[0].types.find((t) => t.name === 'Thing'),
        wrappers: [],
      });
    })

    it('accepts a list-wrapped type from the main schema', () => {
      const t1 = new SchemaTraversal(schema, { type: 'List', ofType: 'OwnThing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema,
        type: schema.types.find((t) => t.name === 'OwnThing'),
        wrappers: ['List'],
      });
    })

    it('accepts a list-wrapped type from an imported schema', () => {
      const t1 = new SchemaTraversal(schema, { type: 'List', ofType: '00000000-0000-1000-8000-000000000000:Thing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: schema.imports[0],
        type: schema.imports[0].types.find((t) => t.name === 'Thing'),
        wrappers: ['List'],
      });
    })

    it('accepts a ref-wrapped type from the main schema', () => {
      const t1 = new SchemaTraversal(schema, { type: 'Ref', ofType: 'OwnThing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema,
        type: schema.types.find((t) => t.name === 'OwnThing'),
        wrappers: ['Ref'],
      });
    })

    it('accepts a ref-wrapped type from the main schema 2', () => {
      const t1 = new SchemaTraversal(schema, { type: 'Ref', ofType: { type: 'String' } });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: t1.primitiveSchema,
        type: { name: 'String' },
        wrappers: ['Ref'],
      });
    })

    it('accepts a ref-wrapped type from an imported schema', () => {
      const t1 = new SchemaTraversal(schema, { type: 'Ref', ofType: '00000000-0000-1000-8000-000000000000:Thing' });
      expect(t1.getContext()).toEqual({
        isRoot: true,
        schema: schema.imports[0],
        type: schema.imports[0].types.find((t) => t.name === 'Thing'),
        wrappers: ['Ref'],
      });
    })
  })

  describe('enterMember', () => {
    it('requires the member name to be provided', () => {
      const t1 = new SchemaTraversal(schema);
      expect(() => t1.enterMember()).toThrow('Expected member name to be a non-empty string');
    });

    it('requires the member name to be non-empty', () => {
      const t1 = new SchemaTraversal(schema);
      expect(() => t1.enterMember('')).toThrow('Expected member name to be a non-empty string');
    });

    it('requires the args to be an object', () => {
      const t1 = new SchemaTraversal(schema);
      expect(() => t1.enterMember('field', 'not an object')).toThrow('Expected args to be an object');
    });

    it('returns true when a valid member name is provided (it matches the schema)', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('ownThing')).toBe(true);
    });

    it('returns false when a valid member name is provided (it does not match the schema)', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('notAFieldOfRoot')).toBe(false);
    });

    it('can enter fields', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('thing')).toBe(true);
    });

    it('can enter computedFields', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('computedField')).toBe(true);
    });

    it('can enter actions', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('anAction')).toBe(true);
    });

    it('can enter events', () => {
      const t1 = new SchemaTraversal(schema);
      expect(t1.enterMember('anEvent')).toBe(true);
    });
  })

  describe('enterParam', () => {
    it('enters a scalar param of a scalar member', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('scalarComputedWithParams');
      const t2 = t1.enterParam('strParam');
      expect(t2).toBe(true);
    });

    it('enters a non scalar param of a scalar member', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('scalarComputedWithParams');
      const t2 = t1.enterParam('refParam');
      expect(t2).toBe(true);
    });

    it('enters a scalar param of a non-scalar member', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('scalarComputedWithParams');
      const t2 = t1.enterParam('strParam');
      expect(t2).toBe(true);
    });

    it('enters a non-scalar param of a non-scalar member', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('scalarComputedWithParams');
      const t2 = t1.enterParam('refParam');
      expect(t2).toBe(true);
    });
  });

  describe('getTyped', () => {
    it('computes the typed of the root', () => {
      const t1 = new SchemaTraversal(schema, 'Root');
      expect(t1.getTyped()).toEqual({ type: 'Root' });
    });

    it('computes the typed of a ref', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('ownThingRef');
      expect(t1.getTyped()).toEqual({ type: 'Ref', ofType: { type: 'OwnThing' } });
    });

    it('computes the typed of a ref', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('ownThingRef');
      expect(t1.getTyped()).toEqual({ type: 'Ref', ofType: { type: 'OwnThing' } });
    });

    it('computes the typed of a primitive', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('field');
      expect(t1.getTyped()).toEqual({ type: 'String' });
    });

    it('computes the typed of a wrapped primitive', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('fields');
      expect(t1.getTyped()).toEqual({ type: 'List', ofType: { type: 'String' } });
    });
  });

  describe('getParamsTypeAndSchema', () => {
    it('returns the params type when it exists', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('thing');
      t1.enterMember('at');
      expect(t1.getParamsTypeAndSchema()).toEqual({
        type: {
          fields: [
            { name: 'field', type: 'Int' }
          ],
          name: "ThingCollection_at_params",
        },
        schema: schema.imports[0],
      });
    });

    it('returns undefined when the current member has no params', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('thing');
      expect(t1.getParamsTypeAndSchema()).toEqual(undefined);
    });
  });

  describe('typePrefix', () => {
    it('returns the id of the schema when the current member lives in a different schema', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('thing');
      t1.enterMember('at');
      expect(t1.typePrefix).toEqual(schema.imports[0].id + ':');
    });

    it('returns an empty string when the current member lives in the main schema', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('field');
      expect(t1.typePrefix).toEqual('');
    });
  });

  describe('enterRef', () => {
    it('returns true the ref matched the schema', () => {
      const t1 = new SchemaTraversal(schema);
      let r1 = $$(':ownThing.field');
      expect(t1.enterRef(r1)).toEqual(true);
    });

    it('returns false the ref matched the schema', () => {
      const t1 = new SchemaTraversal(schema);
      let r1 = $$(':ownThing.not.in.schema');
      expect(t1.enterRef(r1)).toEqual(false);
    });

    it('starts from the root schema/type even if it was already somewhere else', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('field');

      let r1 = $$(':ownThing.field');
      expect(t1.enterRef(r1)).toEqual(true);
    });
  });

  describe('get ref', () => {
    it('returns a ref to the current location in the schema', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');
      t1.enterMember('field');

      expect(t1.ref).toEqual($$(':ownThing.field'));
    });

    it('returns a ref to the current location in the schema 2', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterRef(':ownThing.thingRef.related.at(index:3)');

      expect(t1.ref).toEqual($$(':ownThing.thingRef.related.at(index:3)'));
    });
  });

  describe('getScalarFields', () => {
    it('returns all scalar fields', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');

      const result = t1.getScalarFields();
      expect(result).toEqual([
        { name: "field", type: "String" },
        { name: "fieldRef", type: "Ref", ofType: { type: "String" } },
        { name: "fields", type: "List", ofType: "String" },
        { name: "int", type: "Int" },
        { name: "float", type: "Float" },
        { name: "bool", type: "Boolean" },
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "voidRef", type: "Ref", ofType: "Void" },
        { name: "void", type: "Void" },
      ]);

    });

    it('returns all scalar fields (including computed)', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');

      const result = t1.getScalarFields({ computed: true });
      expect(result).toEqual([
        { name: "field", type: "String" },
        { name: "fieldRef", type: "Ref", ofType: { type: "String" } },
        { name: "fields", type: "List", ofType: "String" },
        { name: "int", type: "Int" },
        { name: "float", type: "Float" },
        { name: "bool", type: "Boolean" },
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "voidRef", type: "Ref", ofType: "Void" },
        { name: "void", type: "Void" },
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "voidRef", type: "Ref", ofType: "Void" },
      ]);
    });

    it('returns all scalar fields (only computed)', () => {
      const t1 = new SchemaTraversal(schema);
      t1.enterMember('ownThing');

      const result = t1.getScalarFields({ computed: true, fields: false });
      expect(result).toEqual([
        { name: "strList", type: "List", ofType: "String" },
        { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
        { name: "voidRef", type: "Ref", ofType: "Void" },
      ]);

    });
  });
});

