import {
  AssigningVisitor,
  I,
  $$,
  ObjectTraversal,
  AsyncObjectTraversal,
  SchemaVisitor,
  SchemaTraversal,
  CloningVisitor,
  reconstructPath,
} from '../';

import schema from '../resources/testSchema';

function delayed(fn) {
  return () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(fn()), 10);
    });
  };
}

// TODO: use jest.fn
class CountingVisitor {
  enterCount = 0;
  exitCount = 0;
  beginCount = 0;
  endCount = 0;
  total = 0;

  begin() { this.beginCount++; }
  end() { this.endCount++; }
  enter(o, path) {
    if (typeof o === 'number') {
      this.total += o;
    }
    this.enterCount++;
  }
  exit(o, path) {
    this.exitCount++;
  }
}

describe('ObjectTraversal', () => {
  it('calls begin() and end()', () => {
    const t1 = new ObjectTraversal(1);
    const t2 = new CountingVisitor();
    t1.traverse(t2);
    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
  })

  it('accepts all types', () => {
    const t1 = new ObjectTraversal(1);
    const t2 = new ObjectTraversal(true);
    const t3 = new ObjectTraversal('hi');
    const t4 = new ObjectTraversal({ a: { b: 1 }, c: 2 });
    const t5 = new ObjectTraversal([1, 2, [3, { x: 1 }]]);
    const t6 = new ObjectTraversal(null);
    const t7 = new ObjectTraversal(undefined);

    expect(t1.traverse).not.toThrow();
    expect(t2.traverse).not.toThrow();
    expect(t3.traverse).not.toThrow();
    expect(t4.traverse).not.toThrow();
    expect(t5.traverse).not.toThrow();
    expect(t6.traverse).not.toThrow();
    expect(t7.traverse).not.toThrow();
  })

  it('traverses primitive types', () => {
    const t1 = new ObjectTraversal(1);
    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses null', () => {
    const t1 = new ObjectTraversal(null);
    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses undefined', () => {
    const t1 = new ObjectTraversal();
    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses arrays', () => {
    const t1 = new ObjectTraversal([6, 4, 2, true]);
    const t2 = new CountingVisitor();
    t1.traverse(t2);
    expect(t2.enterCount).toEqual(5);
    expect(t2.total).toEqual(12);
  });

  it('traverses objects', () => {
    const t1 = new ObjectTraversal({ a: { b: 1 }, c: 2 });

    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(3);
  });

  it('does not traverse into symbol properties', () => {
    const t1 = new ObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(3);
  })

  it('traverses complex objects correctly', () => {
    const t1 = new ObjectTraversal({
      a: {
        b: [1, 2, 3, {
          x: [{ z: 4, w: [5] }, null, 6]
        }],
        c: true
      },
      c: 2,
      [Symbol('not traversed')]: 1
    });

    const t2 = new CountingVisitor();
    t1.traverse(t2);

    expect(t2.enterCount).toEqual(16);
    expect(t2.exitCount).toEqual(16);
    expect(t2.total).toEqual(23);
  })

  it('provides commands to modify its behavior', () => {
    const t1 = new ObjectTraversal({});
    const t2 = { enter: jest.fn() };

    expect(() => t1.traverse(t2)).not.toThrow();
    expect(t2.enter.mock.calls[0][2]).toHaveProperty('skip')
    expect(t2.enter.mock.calls[0][2]).toHaveProperty('use')
  })

  it('allows visitor to skip nodes when entering', () => {
    const t1 = new ObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    // Visitor that skips objects with a property named "b"
    class SkippingVisitor extends CountingVisitor {
      enter(value, path, { skip }) {
        super.enter(value, path);
        if (value.b !== undefined) {
          return skip();
        }
      }
    }

    const t2 = new SkippingVisitor();
    t1.traverse(t2);

    expect(t2.enterCount).toEqual(3);
    expect(t2.exitCount).toEqual(3);
    expect(t2.total).toEqual(2);
  });

  it('allows visitor to specify that a different value should be traversed instead', () => {
    const t1 = new ObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    // Visitor that skips objects with a property named "b"
    class ReplacingVisitor extends CountingVisitor {
      enter(value, path, { use }) {
        super.enter(value, path);
        if (value.b !== undefined) {
          return use({ d: [4, 3] });
        }
      }
    }

    const t2 = new ReplacingVisitor();
    t1.traverse(t2);

    // enter/exit count should increase by one because we enter a twice, once
    // with the original object and then again with the replacing one
    expect(t2.enterCount).toEqual(7);
    expect(t2.exitCount).toEqual(7);
    expect(t2.total).toEqual(9);
  });

  it('allows visitor to skip children while specifying a value to use instead', () => {
    const t1 = new ObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    const newValue = {};

    // Visitor that skips objects with a property named "b"
    class SkippingVisitor extends CountingVisitor {
      enter(value, path, { skip }) {
        super.enter(value, path);
        if (value.b !== undefined) {
          return skip(newValue);
        }
      }
    }

    const t2 = new SkippingVisitor();
    t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(2);
  });

  it('treats refs as scalar (does not traverse its properties)', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: $$('a:b.c'),
        many: [$$(':'), $$('a:b(x:[a:d]).c')]
      }
    });
    const t2 = new CountingVisitor();

    expect(() => t1.traverse(t2)).not.toThrow();
    expect(t2.enterCount).toEqual(6);
    expect(t2.exitCount).toEqual(6);
  });

  it('array keys are numbers (not strings)', () => {
    const t1 = new ObjectTraversal([6, 4, 2, true]);
    // Visitor that skips objects with a property named "b"
    class Visitor extends CountingVisitor {
      enter(value, path, { use }) {
        if (path) {
          expect(typeof path.key).toBe('number')
        }
      }
    }
    const t2 = new Visitor();
    t1.traverse(t2);
  });
});

describe('AsyncObjectTraversal', () => {
  it('calls begin() and end()', async () => {
    const t1 = new AsyncObjectTraversal(1);
    const t2 = new CountingVisitor();
    await t1.traverse(t2);
    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
  })

  it('accepts all types', async () => {
    const t1 = new AsyncObjectTraversal(1);
    const t2 = new AsyncObjectTraversal(true);
    const t3 = new AsyncObjectTraversal('hi');
    const t4 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2 });
    const t5 = new AsyncObjectTraversal([1, 2, [3, { x: 1 }]]);
    const t6 = new AsyncObjectTraversal(null);
    const t7 = new AsyncObjectTraversal(undefined);

    expect(await t1.traverse).not.toThrow();
    expect(await t2.traverse).not.toThrow();
    expect(await t3.traverse).not.toThrow();
    expect(await t4.traverse).not.toThrow();
    expect(await t5.traverse).not.toThrow();
    expect(await t6.traverse).not.toThrow();
    expect(await t7.traverse).not.toThrow();
  })

  it('traverses primitive types', async () => {
    const t1 = new AsyncObjectTraversal(1);
    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses null', async () => {
    const t1 = new AsyncObjectTraversal(null);
    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses undefined', async () => {
    const t1 = new AsyncObjectTraversal();
    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
    expect(t2.enterCount).toEqual(1);
    expect(t2.exitCount).toEqual(1);
  });

  it('traverses arrays', async () => {
    const t1 = new AsyncObjectTraversal([6, 4, 2, true]);
    const t2 = new CountingVisitor();
    await t1.traverse(t2);
    expect(t2.enterCount).toEqual(5);
    expect(t2.total).toEqual(12);
  });

  it('traverses objects', async () => {
    const t1 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2 });

    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(3);
  });

  it('does not traverse into symbol properties', async () => {
    const t1 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(3);
  })

  it('traverses complex objects correctly', async () => {
    const t1 = new AsyncObjectTraversal({
      a: {
        b: [1, 2, 3, {
          x: [{ z: 4, w: [5] }, null, 6]
        }],
        c: true
      },
      c: 2,
      [Symbol('not traversed')]: 1
    });

    const t2 = new CountingVisitor();
    await t1.traverse(t2);

    expect(t2.enterCount).toEqual(16);
    expect(t2.exitCount).toEqual(16);
    expect(t2.total).toEqual(23);
  })

  it('provides commands to modify its behavior', async () => {
    const t1 = new AsyncObjectTraversal({});
    const t2 = { enter: jest.fn() };

    await t1.traverse(t2);
    expect(t2.enter.mock.calls[0][2]).toHaveProperty('skip')
    expect(t2.enter.mock.calls[0][2]).toHaveProperty('use')
    expect(Object.keys(t2.enter.mock.calls[0][2]).length).toBe(2)
  })

  it('allows visitor to skip children when entering', async () => {
    const t1 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    // Visitor that skips objects with a property named "b"
    class SkippingVisitor extends CountingVisitor {
      enter(value, path, { skip }) {
        super.enter(value, path);
        if (value.b !== undefined) {
          return skip();
        }
      }
    }

    const t2 = new SkippingVisitor();
    await t1.traverse(t2);

    expect(t2.enterCount).toEqual(3);
    expect(t2.exitCount).toEqual(3);
    expect(t2.total).toEqual(2);
  });

  it('allows visitor to specify that a different value should be traversed instead', async () => {
    const t1 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });

    // Visitor that skips objects with a property named "b"
    class ReplacingVisitor extends CountingVisitor {
      enter(value, path, { use }) {
        super.enter(value, path);
        if (value.b !== undefined) {
          return use({ d: [4, 3] });
        }
      }
    }

    const t2 = new ReplacingVisitor();
    await t1.traverse(t2);

    // enter/exit count should increase by one because we enter a twice, once
    // with the original object and then again with the replacing one
    expect(t2.enterCount).toEqual(7);
    expect(t2.exitCount).toEqual(7);
    expect(t2.total).toEqual(9);
  });

  it('allows visitor to skip children while specifying a value to use instead', async () => {
    const t1 = new AsyncObjectTraversal({ a: { b: 1 }, c: 2, [Symbol('not')]: 3 });
    const fn = jest.fn();
    const newValue = {};
    // Visitor that skips objects with a property named "b"
    class SkippingVisitor extends CountingVisitor {
      enter(value, path, { skip }) {
        super.enter(value, path);
        fn(value, path);
        if (value.b !== undefined) {
          return skip(newValue);
        }
      }
    }

    const t2 = new SkippingVisitor();
    await t1.traverse(t2);

    expect(t2.enterCount).toEqual(4);
    expect(t2.exitCount).toEqual(4);
    expect(t2.total).toEqual(2);
    expect(fn.mock.calls[2][0]).toBe(newValue);
    expect(fn.mock.calls[1][1]).toEqual(fn.mock.calls[2][1]);
  });

  it('treats refs as scalar (does not traverse its properties)', async () => {
    const t1 = new AsyncObjectTraversal({
      thing: {
        at: $$('a:b.c'),
        many: [$$(':'), $$('a:b(x:[a:d]).c')]
      }
    });
    const t2 = new CountingVisitor();

    await t1.traverse(t2);
    expect(t2.enterCount).toEqual(6);
    expect(t2.exitCount).toEqual(6);
  })

  it('awaits visitor\'s async functions', async () => {
    const t1 = new AsyncObjectTraversal({
      thing: {
        at: $$('a:b.c'),
        many: [$$(':'), $$('a:b(x:[a:d]).c')]
      }
    });

    const enter = jest.fn();
    const exit = jest.fn();
    const begin = jest.fn();
    const end = jest.fn();
    const t2 = {
      enter: delayed(enter),
      exit: delayed(exit),
      begin: delayed(begin),
      end: delayed(end),
    }

    await t1.traverse(t2);
    expect(enter).toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
    expect(begin).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  })

  it('array keys are numbers (not strings)', async () => {
    const t1 = new AsyncObjectTraversal([6, 4, 2, true]);
    // Visitor that skips objects with a property named "b"
    class Visitor extends CountingVisitor {
      enter(value, path, { use }) {
        if (path) {
          expect(typeof path.key).toBe('number')
        }
      }
    }
    const t2 = new Visitor();
    await t1.traverse(t2);
  });
});

describe('SchemaVisitor', () => {
  it('traverses a simple object that matches the schema', () => {
    const object = {
      thing: {
        at: {
          field: 'some value',
          computed: 'ok',
          doSomething: 1,
        }
      }
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('takes a schema traversal', () => {
    const object = {
      thing: {
        at: {
          field: 'some value',
          computed: 'ok',
          doSomething: 1,
        }
      },
      ownThing: {
        strList: [ 'one', 'two', 'three' ],
        strListList: [ ['one', 'two'], ['three'] ],
      }
    };
    const t0 = new SchemaTraversal(schema);
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(t0);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('takes a schema traversal that points to a list ', () => {
    const object = [
      { field: 'f1', computed: 'c1', doSomething: 1, },
      { field: 'f2', computed: 'c2', doSomething: 2, },
    ];
    const t0 = new SchemaTraversal(schema);
    t0.enterMember('thing');
    t0.enterMember('many');

    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(t0);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('takes a schema traversal that points to a ref', () => {
    const object = {
      ownThing: {
        ownThingRef: $$('a:x') 
      }
    };
    const t0 = new SchemaTraversal(schema);
    t0.enterMember('ownThing');
    t0.enterMember('ownThingRef');

    const t1 = new ObjectTraversal(object.ownThing.ownThingRef);
    const t2 = new SchemaVisitor(t0);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('takes a schema traversal that points to a primitive type (string)', () => {
    const object = 'someValue';
    const t0 = new SchemaTraversal(schema);
    t0.enterMember('ownThing');
    t0.enterMember('field');

    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(t0);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('takes a schema traversal that points to a resolved ref (when allowed)', () => {
    const object = {
      ownThing: {
        ownThingRef: {
          float: 2,
          bool: false,
          thingRef: {
            field: 'f2',
            related: { many: [] },
          }
        },
      }
    };
    const t0 = new SchemaTraversal(schema);
    t0.enterMember('ownThing');
    t0.enterMember('ownThingRef');

    const t1 = new ObjectTraversal(object.ownThing.ownThingRef);
    const t2 = new SchemaVisitor(t0, null, { allowResolvedRefs: true });
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('throws if a field is not part of the schema', () => {
    const object = {
      thing: {
        at: {
          field: 'some value',
          notInSchema: 'ha!',
          doSomething: 1, // TODO: not verifying type
        }
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow(`SchemaVisitor: Member "notInSchema" at path "thing.at" (Thing) not found in schema`);
  })

  it('throws if a Void field holds a value', () => {
    const object = { ownThing: { void: {} } };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow();
  });

  it('throws if a Ref fields holds something other than a ref', () => {
    const object = { ownThing: { voidRef: {} } };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow();
  });

  it('Accepts an object in a Void* field (allowedResolvedRef = true)', () => {
    const object = { ownThing: { voidRef: {} } };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema, null, { allowResolvedRefs: true });
    expect(() => t1.traverse(t2)).not.toThrow();
  });

  it('traverses a void ref', () => {
    const object = { ownThing: { voidRef: $$(':') } };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  });

  it('throws if an Int field does not hold a number', () => {
    const object = { thing: { at: { int: '' } }, };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected number at path "thing.at.int"');
  })

  it('throws if an Float field does not hold a number', () => {
    const object = { thing: { at: { float: '' } }, };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected number at path "thing.at.float"');
  })

  it('throws if a Boolean field does not hold a boolean', () => {
    const object = { thing: { at: { bool: '' } }, };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected boolean at path "thing.at.bool"');
  })

  it('throws if a String field does not hold a string', () => {
    const object = { thing: { at: { field: true } }, };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected string at path "thing.at.field"');
  })

  it('throws if the number of nested arrays is less than the number of nested lists in the schema', () => {
    const object = {
      thing: {
        lists: [{ field: 'value 1', }]
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected array at path "thing.lists.0"');
  })

  it('throws if the number of nested arrays is more than the number of nested lists in the schema', () => {
    const object = {
      thing: {
        lists: [
          [
            [
              { field: 'value 1' }
            ]
          ]
        ]
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow('SchemaVisitor: Expected object at path "thing.lists.0.0"');
  })

  it('traverses an array/List correctly', () => {
    const object = {
      thing: {
        many: [
          {
            field: '1',
          },
          {
            field: '2',
          }
        ]
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('traverses lists of lists', () => {
    const object = {
      thing: {
        lists: [
          [
            {
              field: 'value 1',
            },
            {
              field: 'value 2',
            }
          ]
        ]
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('traverses nested lists', () => {
    const object = {
      thing: {
        lists: [
          [
            {
              field: 'value 1',
              related: {
                many: [
                  {
                    bool: true,
                    related: {
                      many: [
                        {
                          int: 4,
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        ]
      },
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  })

  it('allows composition with another visitor', () => {
    const object = {
      thing: {
        at: {
          field: 'x',
          computed: 'y',
          doSomething: 10,
        }
      }
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new CountingVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.total).toEqual(10);
    expect(t2.enterCount).toEqual(6);
    expect(t2.exitCount).toEqual(6);
    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
  })

  it('provides a schema related context to its sub-visitor', () => {
    const t1 = new ObjectTraversal({});
    const t2 = { enter: jest.fn() };
    const t3 = new SchemaVisitor(schema, t2);

    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.enter.mock.calls[0][3]).toHaveProperty('type')
    expect(t2.enter.mock.calls[0][3]).toHaveProperty('schema')
    expect(t2.enter.mock.calls[0][3]).toHaveProperty('wrappers')
  })

  it('turns json refs object fields into Refs', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { $ref: 'a:b.c' },
        many: [{ $ref: 'a:b.c' }, { $ref: 'a:b(x:[a:b]).c' }],
      }
    });
    const output = {
      thing: {
        at: $$('a:b.c'),
        many: [$$('a:b.c'), $$('a:b(x:[a:b]).c')]
      }
    };

    const t2 = new CloningVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.result).toEqual(output);
  })

  it('turns json refs scalar fields into Refs', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { field: { $ref: 'a:b.c' } },
        many: [{ field: { $ref: 'a:b.c' } }],
      },
    });
    const output = {
      thing: {
        at: { field: $$('a:b.c') },
        many: [{ field: $$('a:b.c') }],
      },
    };

    const t2 = new CloningVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.result).toEqual(output);
  })

  it('turns Ref fields (provided as json refs) into Refs', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { field: { $ref: 'a:b.c' } },
        many: [{ field: { $ref: 'a:b.c' } }],
      },
    });
    const output = {
      thing: {
        at: { field: $$('a:b.c') },
        many: [{ field: $$('a:b.c') }],
      },
    };

    const t2 = new CloningVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.result).toEqual(output);
  })

  it('does not turn accept plain strings for Ref fields', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { stringRef: 'a:b.c' },
        many: [{ stringRef: 'a:b.c' }],
      },
    });
    const output = {
      thing: {
        at: { stringRef: $$('a:b.c') },
        many: [{ stringRef: $$('a:b.c') }],
      },
    };

    const t2 = new CloningVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).toThrow('Expected ref at path "thing.at.stringRef"');
  })

  it('accepts refs in ref fields', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { stringRef: { $ref: 'a:b.c' } }
      },
    });
    const output = {
      thing: {
        at: { stringRef: $$('a:b.c') },
      },
    };

    const t2 = new CloningVisitor();
    const t3 = new SchemaVisitor(schema, t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t2.result).toEqual(output);
  })

  it('accepts null in a scalar field', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { int: null }
      },
    });

    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).not.toThrow();
  });

  it('rejects ref fields which value is not a ref', () => {
    const t1 = new ObjectTraversal({
      thing: {
        at: { stringRef: 'some string' }
      },
    });

    const t2 = new SchemaVisitor(schema);
    expect(() => t1.traverse(t2)).toThrow();
  })
});

describe('CloningVisitor', () => {
  it('supports primitive types', () => {
    const input = 42;
    const t1 = new ObjectTraversal(input);
    const t2 = new CloningVisitor();
    t1.traverse(t2);
    expect(t2.result).toEqual(input);
  });

  it('creates an identical deep copy of the object', () => {
    const input = { a: { b: 1 }, c: { d: [1, 2, [true, false]] }};
    const t1 = new ObjectTraversal(input);
    const t2 = new CloningVisitor();
    t1.traverse(t2);

    expect(t2.result).toEqual(input);
    expect(t2.result).not.toBe(input);
  });

  it('clones the modified version if the use() command is used', () => {
    const input = { a: { b: 1 }, c: { d: [1, 2, [true, false]] }};
    const output = { a: [1, 2, 3], c: { d: [1, 2, [true, false]] }};
    const t1 = new ObjectTraversal(input);
    class ModifyingVisitor {
      enter(object, path, { use }) {
        if (object.b !== undefined) {
          return use(output.a)
        }
      }
    }
    const t2 = new CloningVisitor(new ModifyingVisitor);
    t1.traverse(t2);

    expect(t2.result).toEqual(output);
    expect(t2.result).not.toBe(output);
  });

  it('clones null properties', () => {
    const input = { a: { b: null } };
    const t2 = new CloningVisitor();
    const t1 = new ObjectTraversal(input);
    t1.traverse(t2);

    expect(t2.result).toEqual(input);
    expect(t2.result.a.b).toBeNull();
  });

  it('does not duplicate immutable values (not needed)', () => {
    const input = { a: { b: I.Map({x: 1}) }, c: { d: [1, 2, [I.List([1, 2, 3]), false]] }};
    const t2 = new CloningVisitor();
    const t1 = new ObjectTraversal(input);
    t1.traverse(t2);

    expect(t2.result).toEqual(input);
    expect(t2.result).not.toBe(input);
    expect(t2.result.a.b).toBe(input.a.b);
    expect(t2.result.c.d[2][0]).toBe(input.c.d[2][0]);
  });

  it('allows composition with another visitor', () => {
    const object = {
      thing: {
        at: {
          field: 'x',
          computed: 'y',
          doSomething: 10,
        }
      }
    };
    const t1 = new ObjectTraversal(object);
    const t2 = new CountingVisitor();
    const t3 = new CloningVisitor(t2);
    expect(() => t1.traverse(t3)).not.toThrow();
    expect(t3.result).not.toBe(object);
    expect(t3.result).toEqual(object);
    expect(t2.total).toEqual(10);
    expect(t2.enterCount).toEqual(6);
    expect(t2.exitCount).toEqual(6);
    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
  })
})

describe('AssigningVisitor', () => {
  it('supports primitive types', () => {
    const input = 42;
    const t1 = new ObjectTraversal(input);
    const t2 = new AssigningVisitor();
    expect(() => t1.traverse(t2)).not.toThrow();
  });

  it('assignes a value in the original object when the use command is used', () => {
    const input = { a: { b: 1 }, c: { d: [1, 2, [true, false]] }};
    const t1 = new ObjectTraversal(input);
    class ModifyingVisitor {
      enter(object, path, { use }) {
        if (object.b !== undefined) {
          return use({ e: 2 })
        }
      }
    }
    const t2 = new AssigningVisitor(new ModifyingVisitor());
    t1.traverse(t2);

    expect(input).toEqual({ a: { e: 2 }, c: { d: [1, 2, [true, false]] }});
  });

  it('assignes a value in the original object when the use command is used multiple times', () => {
    const input = { a: { b: 1 }, c: { d: [1, 2, [true, false]] }};
    const t1 = new ObjectTraversal(input);
    class ModifyingVisitor {
      enter(object, path, { use }) {
        if (object.b !== undefined) {
          return use({ e: $$(':') })
        }
        if (object.e !== undefined) {
          return use({ f: $$('a:b') })
        }
      }
    }
    const t2 = new AssigningVisitor(new ModifyingVisitor());
    t1.traverse(t2);

    expect(input).toEqual({ a: { f: $$('a:b') }, c: { d: [1, 2, [true, false]] }});
  });
})

describe('Combinations of visitors', () => {
  it('supports schema -> clone', () => {
    const input = {
      thing: {
        at: {
          field: 'some value',
          computed: 'x',
          doSomething: 7,
        }
      }
    };
    const t1 = new ObjectTraversal(input);
    const t2 = new CountingVisitor();
    const t3 = new CloningVisitor(t2);
    const t4 = new SchemaVisitor(schema, t3);
    expect(() => t1.traverse(t4)).not.toThrow();
    expect(t3.result).toEqual(input);
    expect(t3.result).not.toBe(input);
    expect(t2.total).toEqual(7);
    expect(t2.enterCount).toEqual(6);
    expect(t2.exitCount).toEqual(6);
    expect(t2.beginCount).toEqual(1);
    expect(t2.endCount).toEqual(1);
  });
});
