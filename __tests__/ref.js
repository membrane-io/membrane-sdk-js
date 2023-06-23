import { $$, Ref, PathElem } from '../';
import I from 'immutable';
import * as matchers from 'jest-immutable-matchers';
import * as vm from 'vm';

describe('$$', () => {
  beforeEach(function () {
    jest.addMatchers(matchers);
  });

  it('Throws when no argument is provided', () => {
    expect(() => $$()).toThrow('Refs can only be constructed');
  });

  it('Throws when null is passed as an argument', () => {
    expect(() => $$(null)).toThrow('Refs can only be constructed');
  });

  it('creates refs from a string', () => {
    const t1 = $$('a:b');
    const t2 = $$(':path.to.value');
    const t3 = $$(':path(x:1).with_some(y:"hi").arguments(value:true)');

    expect(t1).toBeInstanceOf(Ref);
    expect(t2).toBeInstanceOf(Ref);
    expect(t3).toBeInstanceOf(Ref);
  });

  it('creates refs from other refs', () => {
    const t1 = $$('a:b.c');
    const t2 = $$(t1);

    expect(t2).toEqualImmutable(t1);
  });

  it('creates refs from a ref that was created in a different context', () => {
    const t1 = $$('a:b.c');

    // TODO: jest doesn't allow me to clear the cache
    // console.log(module);
    // console.log(require.resolve('../lib/ref.js'));
    // console.log(Object.keys(require.cache));
    // console.log(require.cache[require.resolve('../lib/ref.js')]);
    // delete require.cache[require.resolve('../lib/ref.js')];
    // console.log(require.cache[require.resolve('../lib/ref.js')]);
    // let { $$: $$2, Ref: Ref2 } = require('../lib/ref.js');
    // console.log(Object.keys(require.cache));
    // console.log(require.cache[require.resolve('../lib/ref.js')]);
    // const t2 = $$2(`${t1.toString()}`);
    //
    // expect(Ref).not.toBe(Ref2);
    // expect(t1).toBeInstanceOf(Ref);
    // expect(t1).not.toBeInstanceOf(Ref2);
    // expect(t2).not.toBeInstanceOf(Ref);
    // expect(t2).toBeInstanceOf(Ref2);
    // expect(t2).toEqualImmutable(t1);
  });

  it('handles complex ref strings correctly', () => {
    const t1 = $$('program:path(x:1).with(y:[inner:ref(with:"args").and.stuff]).arguments(value:true)');

    // path(...)
    expect(t1.program).toEqual('program');
    expect(t1.getIn(['path', 0]).name).toEqual('path');
    expect(t1.getIn(['path', 0, 'args'])).toEqualImmutable(I.Map({ x: 1 }));

    // with(...)
    expect(t1.getIn(['path', 1]).name).toEqual('with');
    expect(t1.getIn(['path', 1, 'args', 'y'])).toBeInstanceOf(Ref);
    expect(t1.getIn(['path', 1, 'args', 'y', 'program'])).toEqual('inner');
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 0, 'name'])).toEqual('ref');
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 0, 'args'])).toEqualImmutable(I.Map({ with: 'args' }));
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 1, 'name'])).toEqual('and');
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 1, 'args'])).toEqualImmutable(I.Map());
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 2, 'name'])).toEqual('stuff');
    expect(t1.getIn(['path', 1, 'args', 'y', 'path', 2, 'args'])).toEqualImmutable(I.Map());

    // arguments(...)
    expect(t1.getIn(['path', 2, 'name'])).toEqual('arguments');
    expect(t1.getIn(['path', 2, 'args'])).toEqualImmutable(I.Map({ value: true }));
  });

});

describe('PathElem', () => {
  describe('withArgs', () => {
    it('it takes an immutable Map', () => {
      const args = I.Map({ a: 1, b: true });

      let t1 = new PathElem({ name: 'elem' });
      expect(() => { t1 = t1.withArgs(args) }).not.toThrow();
      expect(t1.args.get('a')).toEqual(args.get('a'));
      expect(t1.args.get('b')).toEqual(args.get('b'));
    });

    it('it takes a plain js object', () => {
      const args = { a: 1, b: true };

      let t1 = new PathElem({ name: 'elem' });
      expect(() => { t1 = t1.withArgs(args) }).not.toThrow();
      expect(I.Map.isMap(t1.args)).toBe(true);
      expect(t1.args.get('a')).toEqual(args.a);
      expect(t1.args.get('b')).toEqual(args.b);
    });
  });

  it('can replace its arguments', () => {
    const t1 = $$(':a(x:1,y:true,z:"same")');
    const t2 = $$(':b.c.d(x:2,y:false,z:"same")');

    const args = t2.path.get(2).args;

    expect(t1.path.get(0).withArgs(args).args).toEqualImmutable(t2.path.get(2).args);
  });
});

describe('Ref', () => {
  beforeEach(function () {
    jest.addMatchers(matchers);
  });

  it('normalizes the string representation when converted to a string', () => {
    // Notice the order of parameters, they are sorted in the normalized version
    const refStr = 'program:path(z:5,y:0,x:1).with(y:[inner:ref(b:"s",a:1).and.stuff]).arguments(value:true)';
    const normalizedRefStr = 'program:path(x:1,y:0,z:5).with(y:[inner:ref(a:1,b:"s").and.stuff]).arguments(value:true)';
    const t1 = $$(refStr);

    expect(t1.toString()).toEqual(normalizedRefStr);
  });

  it('turns itself correctly into valid graphql arguments', () => {
    // Notice the order of parameters, they are sorted in the normalized version
    const refStr = 'program:path(z:5,y:0,x:1).with(y:[inner:ref(b:"s",a:1).and.stuff]).arguments(value:true)';
    const gqlArgsStr = 'program:path(x:1,y:0,z:5).with(y:"inner:ref(a:1,b:\\"s\\").and.stuff").arguments(value:true)';
    const t1 = $$(refStr);

    expect(t1.toGraphQLArgs()).toEqual(gqlArgsStr);
  });

  it('compares itself correctly against other refs', () => {
    const t1 = $$('a:b.c');
    const t2 = $$('a:b.c');
    const t3 = $$('a:b.d');
    const t4 = $$('e:b.d');
    const t5 = $$(':');

    expect(t1).toEqualImmutable(t2);
    expect(t1).not.toEqualImmutable(t3);
    expect(t1).not.toEqualImmutable(t4);
    expect(t1).not.toEqualImmutable(t5);
  });

  describe('withProgram', () => {
    it('sets the program to the empty string if no program is provided', () => {
      const t1 = $$('a:b.c');
      const t2 = t1.withProgram();

      expect(t2.program).toEqual('');
      expect(t2.path).toEqual($$(':b.c').path);
    })

    it('sets the program to the provided value without changing the path', () => {
      const t1 = $$('a:b.c');
      const t2 = t1.withProgram('d');

      expect(t2.program).toEqual('d');
      expect(t2.path).toEqual($$(':b.c').path);
    });
  });

  describe('withoutProgram', () => {
    it('sets the program to the empty string without changing the path', () => {
      const t1 = $$('a:b.c');
      const t2 = t1.withoutProgram();

      expect(t2.program).toEqual('');
      expect(t2.path).toEqual($$(':b.c').path);
    });
  });

  describe('withoutPath', () => {
    it('sets the path to the empty List without changing the program', () => {
      const t1 = $$('a:b.c');
      const t2 = t1.withoutPath();

      expect(t2.program).toEqual('a');
      expect(t2.path).toEqual($$(':').path);
    });
  });

  it('can change a single argument of a path element', () => {
    const t1 = $$('a:b.c');
    const t2 = $$('a:b.c(y:2)').withArg('x', 1);
    const t3 = $$('a:b.c').withArg('x', 1, 0);
    const t4 = $$('a:b.c.d.e').withArg('x', 1, -2);

    expect(t2).toEqualImmutable($$('a:b.c(x:1,y:2)'));
    expect(t3).toEqualImmutable($$('a:b(x:1).c'));
    expect(t4).toEqualImmutable($$('a:b.c.d(x:1).e'));
  });

  it('can change all arguments of a path element', () => {
    const t1 = $$('a:b.c');
    const t2 = $$('a:b.c(y:2)').withArgs({ x: 1 });
    const t3 = $$('a:b.c').withArgs({ x: 1 }, 0);
    const t4 = $$('a:b.c.d.e').withArgs({ x: 1 }, -3);

    expect(t2).toEqualImmutable($$('a:b.c(x:1)'));
    expect(t3).toEqualImmutable($$('a:b(x:1).c'));
    expect(t4).toEqualImmutable($$('a:b.c(x:1).d.e'));
  });

  describe('withoutArgs', () => {
    it('does not do anything if there is no path', () => {
      const t1 = $$('a:');
      expect(t1.withoutArgs()).toEqualImmutable(t1);
    });

    it('removes the args of the last path element', () => {
      const t1 = $$('a:b.c(y:1).d(x:1).e(x:1)');
      const output = $$('a:b.c(y:1).d(x:1).e');
      expect(t1.withoutArgs()).toEqualImmutable(output);
    });
  });

  it('can change its path', () => {
    const t1 = $$('a:b.c');
    const t2 = $$('x:d.e.f');
    const t3 = t1.withPath(t2.path);

    expect(t3).toEqualImmutable($$('a:d.e.f'));
  });

  it('can concatenate another ref', () => {
    const t1 = $$('a:b(x:"hi").c');
    const t2 = $$('a:c.d(y:2)');
    const t3 = t1.concat(t2);
    expect(t3).toEqualImmutable($$('a:b(x:"hi").c.c.d(y:2)'));
  });

  it('can rebase itself onto another ref', () => {
    const t1 = $$('a:b(x:"hi").c');
    const t2 = $$('a:c.d(y:2)');
    const t3 = t1.rebase(t2);
    expect(t3).toEqualImmutable($$('a:c.d(y:2).b(x:"hi").c'));
  });

  it('can express itself as relative to another ref', () => {
    const t1 = $$('a:b(x:"hi").c');
    const t2 = $$('a:b(x:"hi").c.d(y:[a:b])');
    const t3 = t2.relativeTo(t1, '1');
    expect(t3).toEqualImmutable($$('1:d(y:[a:b])'));
  });

  it('fails to express itself as relative to a ref that points to another program', () => {
    const t1 = $$('a:b(x:"hi").c');
    const t2 = $$('x:b(x:"hey").c.d(y:[a:b])');
    expect(() => { t2.relativeTo(t1, '1') }).toThrow('Ref cannot be expressed as relative to ref that points to another program');
  });

  it('fails to express itself as relative to a ref that is not a prefix of it', () => {
    const t1 = $$('a:b(x:"hi").c');
    const t2 = $$('a:b(x:"hey").c.d(y:[a:b])');
    expect(() => { t2.relativeTo(t1, '1') }).toThrow('Ref cannot be expressed as relative to provided ref');
  });

  describe('isPrefix', () => {
    it('returns true for a ref that is a prefix of the other one', () => {
      const t1 = $$('a:b(x:"hi",y:[a:b]).c');
      const t2 = $$('a:b(x:"hi",y:[a:b]).c.d.e');
      const t3 = $$('a:b(x:"hi",y:[a:b]).c.d.e(x:"hi",y:[a:b])');
      const t4 = $$('a:b(x:"hi",y:[a:b]).c(z:1)');
      expect(t1.isPrefix(t2)).toBe(true);
      expect(t1.isPrefix(t1)).toBe(true);
      expect(t1.isPrefix(t3)).toBe(true);
      expect(t1.isPrefix(t4)).toBe(true);
    });

    it('returns false for a ref which is not a prefix of the other one', () => {
      const t1 = $$('a:b(x:"hi",y:[a:b]).c');
      const t2 = $$('b:b(x:"hi",y:[a:b]).c');
      const t3 = $$('a:b(x:"bye",y:[a:b]).c.e');
      const t4 = $$('a:b(x:"hi",y:[a:b]).d');
      const t5 = $$('a:');
      expect(t1.isPrefix(t2)).toBe(false);
      expect(t1.isPrefix(t3)).toBe(false);
      expect(t1.isPrefix(t4)).toBe(false);
      expect(t1.isPrefix(t5)).toBe(false);
    });
  });

  it('can get the last element of the path', () => {
    const t1 = $$('a:b(x:"hey").c.d(y:[a:b])');
    const elem = new PathElem({
      name: 'd',
      args: I.Map({ y: $$('a:b') })
    });
    expect(t1.last()).toEqualImmutable(elem);
  });

  describe('push', () => {
    it('adds a new path element at the end of the path', () => {
      const t1 = $$('a:b');
      const t2 = t1.push('c', { x: 1, y: $$('a:b') });

      expect(t2).toEqualImmutable($$('a:b.c(x:1,y:[a:b])'));
    });
  });

  describe('pop', () => {
    it('removes the last element from the path', () => {
      const t1 = $$('a:b.c(x:1,y:[a:b])');
      const t2 = t1.pop();
      expect(t2).toEqualImmutable($$('a:b'));
    });
  });

  describe('shift', () => {
    it('removes the first element from the path', () => {
      const t1 = $$('a:b.c(x:1,y:[a:b])');
      const t2 = t1.shift();
      expect(t2).toEqualImmutable($$('a:c(x:1,y:[a:b])'));
    });
  });

  it('will pop the program after popping all elements from the path', () => {
    const t1 = $$('a:');
    const t2 = t1.pop();
    expect(t2).toEqualImmutable($$(':'));
  });

  it('gets the arguments at a path element correctly', () => {
    const t1 = $$('a:b.c(x:1,y:[a:b]).d(z:true)');

    expect(t1.argsAt(':')).toEqual({});
    expect(t1.argsAt(':b')).toEqual({});
    expect(t1.argsAt(':b.c')).toEqual({ x: 1, y: $$('a:b') });
    expect(t1.argsAt($$(':b.c.d'))).toEqual({ z: true });
    expect(t1.argsAt(':b.c.d.e')).toEqual({});
  });
});
