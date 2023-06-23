import { $$, RefTraversal } from '../';
import schema from '../resources/testSchema';

describe('RefTraversal', () => {
  it('accepts a ref string', () => {
    const t1 = new RefTraversal(':', schema);
    expect(t1.type.name).toBe('Root');
  })

  it('accepts a ref object', () => {
    const t1 = new RefTraversal($$(':'), schema);
    expect(t1.type.name).toBe('Root');
  })

  it('requires a schema', () => {
    expect(() => new RefTraversal(':')).toThrow();
  })

  it('defaults to Root if no type is specified', () => {
    const t1 = new RefTraversal($$(':'), schema);
    expect(t1.type).toBe(schema.types.find((t) => t.name === 'Root'));
  })

  it('defaults to imported Root if no type is specified but ref has program value', () => {
    const t1 = new RefTraversal('test:', schema);
    expect(t1.type).toBe(schema.imports[0].types.find((t) => t.name === 'Root'));
    expect(t1.schema).toBe(schema.imports[0]);
  })

  it('accepts a specific type the main schema', () => {
    const t1 = new RefTraversal($$(':field'), schema, 'OwnThing');
    expect(t1.type).toBe(schema.types.find((t) => t.name === 'OwnThing'));
    t1.toEnd();
    expect(t1.type.name).toBe('String');
  });

  it('accepts a specific type in an imported schema', () => {
    const t1 = new RefTraversal($$(':at.computed'), schema, 'test:ThingCollection');
    expect(t1.type).toBe(schema.imports[0].types.find((t) => t.name === 'ThingCollection'));
    expect(t1.schema).toBe(schema.imports[0]);
    t1.toEnd();
    expect(t1.type.name).toBe('String');
  });

  it('allows traversal into an imported Type', () => {
    const t1 = new RefTraversal($$(':thing.at'), schema);
    t1.toEnd();
    expect(t1.schema).toBe(schema.imports[0]);
    expect(t1.type).toBe(schema.imports[0].types.find((t) => t.name === 'Thing'));
  })

  it('allows traversal into an imported Type (through a Ref)', () => {
    const t1 = new RefTraversal($$(':ownThing.thingRef'), schema);
    t1.toEnd();
    expect(t1.schema).toBe(schema.imports[0]);
    expect(t1.type).toBe(schema.imports[0].types.find((t) => t.name === 'Thing'));
  })

  it('allows traversal through multiple imported schemas', () => {
    const t1 = new RefTraversal($$(':ownThing.thingRef.otherImport.self'), schema);
    t1.toEnd();
    expect(t1.schema).toBe(schema.imports[1]);
    expect(t1.type).toBe(schema.imports[1].types.find((t) => t.name === 'Root'));
  })
});
