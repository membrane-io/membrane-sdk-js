import matchesInterface from '../lib/matchesInterface';
import { SchemaTraversal, deepClone } from '../lib';
import { describe, expect, it } from "@jest/globals";
import schema from '../resources/testSchema';

describe('matchesInterface', () => {
  it('anything matches an empty type', () => {
    const t1 = new SchemaTraversal(schema);
    const i1 = new SchemaTraversal({ types: [{ name: 'Root' }] });
    expect(matchesInterface(t1, i1)).toBe(true);

    const t2 = new SchemaTraversal(schema);
    const i2 = new SchemaTraversal({ types: [{ name: 'Root' }] });
    expect(t2.enterMember('scalarComputedWithParams')).toBe(true);
    expect(matchesInterface(t2, i2)).toBe(true);

    const t3 = new SchemaTraversal(schema);
    const i3 = new SchemaTraversal({ types: [{ name: 'Root' }] });
    expect(t3.enterMember('nonScalarComputedWithParams')).toBe(true);
    expect(matchesInterface(t3, i3)).toBe(true);
  });

  it('anything matches a Void member', () => {
    const t1 = new SchemaTraversal({
      types: [{ name: 'Root', fields: [{ name: 'f1', type: 'Int' }] }]
    });
    const i1 = new SchemaTraversal({
      types: [{ name: 'Root', fields: [{ name: 'f1', type: 'Void' }] }]
    });
    expect(matchesInterface(t1, i1)).toBe(true);

    const t2 = new SchemaTraversal({
      types: [{ name: 'Root', actions: [{ name: 'f1', type: 'Int' }] }]
    });
    const i2 = new SchemaTraversal({
      types: [{ name: 'Root', fields: [{ name: 'f1', type: 'Void' }] }]
    });
    expect(matchesInterface(t2, i2)).toBe(true);
  });

  it('does not match if interface has extra fields', () => {
    const t1 = new SchemaTraversal(schema);
    const i1 = new SchemaTraversal(
      { types: [ { name: 'Root', fields: [{ name: 'dontHaveIt', type: 'Int' }] } ] }
    );
    expect(matchesInterface(t1, i1)).toBe(false);

    const i2 = new SchemaTraversal(
      { types: [
        { name: 'Root', fields: [{ name: 'dontHaveIt', type: 'T' }] },
        { name: 'T', fields: [{ name: 'f', type: 'Int' }] }
      ] }
    );
    expect(matchesInterface(t1, i2)).toBe(false);
  });

  // it('does not match if interface has extra computedFields', () => {
  //   const t1 = new SchemaTraversal(schema);
  //   const i1 = new SchemaTraversal(
  //     { types: [ { name: 'Root', computedFields: [{ name: 'dontHaveIt', type: 'Int' }] } ] }
  //   );
  //   expect(matchesInterface(t1, i1)).toBe(false);

  //   const i2 = new SchemaTraversal(
  //     { types: [
  //       { name: 'Root', computedFields: [{ name: 'dontHaveIt', type: 'T' }] },
  //       { name: 'T', computedFields: [{ name: 'f', type: 'Int' }] }
  //     ] }
  //   );
  //   expect(matchesInterface(t1, i2)).toBe(false);
  // });

  it('does not match if interface has extra actions', () => {
    const t1 = new SchemaTraversal(schema);
    const i1 = new SchemaTraversal(
      { types: [ { name: 'Root', actions: [{ name: 'dontHaveIt', type: 'Int' }] } ] }
    );
    expect(matchesInterface(t1, i1)).toBe(false);
  });

  it('does not match if interface has extra events', () => {
    const t1 = new SchemaTraversal(schema);
    const i1 = new SchemaTraversal(
      { types: [ { name: 'Root', events: [{ name: 'dontHaveIt', type: 'Int' }] } ] }
    );
    expect(matchesInterface(t1, i1)).toBe(false);
  });

  // TODO: revisit this in the future. Int* should be compatible with Int
  it('does not match if field has extra wrapper', () => {
    const t1 = new SchemaTraversal(
      { types: [ { name: 'Root', events: [{ name: 'field', type: 'Int' }] } ] }
    );
    const i1 = new SchemaTraversal(
      { types: [ { name: 'Root', events: [{ name: 'field', type: 'Ref', ofType: 'Int' }] } ] }
    );
    expect(matchesInterface(t1, i1)).toBe(false);
    expect(matchesInterface(i1, t1)).toBe(false);
  });

  it('matches an interface with different type names', () => {
    const t1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'T1' }, { name: 'f2', type: 'T2' }] },
          { name: 'T1', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
          { name: 'T2', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
        ]
      }
    );
    const i1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'T3' }, { name: 'f2', type: 'T4' }] },
          { name: 'T3', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
          { name: 'T4', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
        ]
      }
    );
    expect(matchesInterface(t1, i1)).toBe(true);
  });

  // TODO: revisit this in the future. Int* should be compatible with Int
  it('matches if type has extra members', () => {
    const t1 = new SchemaTraversal(
      { types: [ { name: 'Root', events: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] } ] }
    );
    const i1 = new SchemaTraversal(
      { types: [ { name: 'Root', events: [{ name: 'f1', type: 'Int' }] } ] }
    );
    expect(matchesInterface(t1, i1)).toBe(true);
  });

  it('finishes matching a recursive interface', () => {
    const t1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'T1' }] },
          { name: 'T1', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'T1' }] },
        ]
      }
    );
    const i1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'T2' }] },
          { name: 'T2', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'T2' }] },
        ]
      }
    );
    expect(matchesInterface(t1, i1)).toBe(true);
  });

  it('matches a complex interface', () => {
    const t1 = new SchemaTraversal(schema);
    const i1 = new SchemaTraversal(deepClone(schema));
    expect(matchesInterface(t1, i1)).toBe(true);
  });

  it('fills up the "mismatches" array if provided', () => {
    const t1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'T1' }] },
          { name: 'T1', fields: [{ name: 'f3', type: 'Int' }, { name: 'f4', type: 'Void' }] },
        ]
      }
    );
    const i1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [{ name: 'f1', type: 'Float' }, { name: 'f2', type: 'T2' }] },
          { name: 'T2', fields: [{ name: 'f3', type: 'String' }, { name: 'f4', type: 'T2' }] },
        ]
      }
    );

    const mismatches = [];
    const itMatches = matchesInterface(t1, i1, mismatches);
    expect(itMatches).toBe(false);
    expect(mismatches.length).toBe(4);

    expect(mismatches).toContain('Type of Root.f1 (Int) does not match interface Root.f1 (Float)');
    expect(mismatches).toContain('Type of T1.f3 (Int) does not match interface T2.f3 (String)');
    expect(mismatches).toContain('Type Void has no member named f3 while matching against T2');
    expect(mismatches).toContain('Type Void has no member named f4 while matching against T2' );
  });

  // NOTE: Use this to test memoization. Compare times with it enabled and disabled
  it('memoization test', () => {
    const t1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [] },
          { name: 'T1', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
        ]
      }
    );
    const i1 = new SchemaTraversal(
      {
        types: [
          { name: 'Root', fields: [] },
          { name: 'T2', fields: [{ name: 'f1', type: 'Int' }, { name: 'f2', type: 'Int' }] },
        ]
      }
    );
    const N = 1000000;
    const root1 = t1.schema.types[0];
    const root2 = i1.schema.types[0];
    for (let i = 0; i < N; ++i) {
      root1.fields.push({ name: 'f' + N, type: 'T1' });
      root2.fields.push({ name: 'f' + N, type: 'T2' });
    }
    console.time('Memoization');
    expect(matchesInterface(t1, i1)).toBe(true);
    console.timeEnd('Memoization');
  });

});
