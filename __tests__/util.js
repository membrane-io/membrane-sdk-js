import {
  isValidTypeIdentifier,
  isValidEnvironmentName,
  isValidDependencyName,
  isValidTagName,
  isRefTyped,
  deepClone,
  deepEquals,
  shallowEquals,
  without,
  indent,
  randomHex,
} from '../';

describe('isValidTypeIdentifier', () => {
  it('rejects 36 char-long non-uuids', () => {
    expect(isValidTypeIdentifier('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:TypeA')).toBe(false);
  });
  it('rejects >36 char-long', () => {
    expect(isValidTypeIdentifier('0000000000000000000000000000000000000:TypeA')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidTypeIdentifier('')).toBe(false);
  });
  it('rejects non-strings', () => {
    expect(isValidTypeIdentifier(0)).toBe(false);
    expect(isValidTypeIdentifier(false)).toBe(false);
    expect(isValidTypeIdentifier(true)).toBe(false);
  });
  it('rejects empty program name', () => {
    expect(isValidTypeIdentifier(':TypeA')).toBe(false);
  });
  it('rejects empty type name', () => {
    expect(isValidTypeIdentifier('dep:')).toBe(false);
  });
  it('rejects both empty', () => {
    expect(isValidTypeIdentifier(':')).toBe(false);
  });
  it('accepts identifiers without colon', () => {
    expect(isValidTypeIdentifier('TypeA')).toBe(true);
  });
  it('accepts identifiers with colon', () => {
    expect(isValidTypeIdentifier('dep:TypeA')).toBe(true);
  });
  // temp test to validate id
  it('accepts uuids', () => {
    expect(isValidTypeIdentifier('pro-16badf899b6aeab38e9:TypeA')).toBe(true);
    expect(isValidTypeIdentifier('pro-16badf899b6aeab38e9:RepositoryCollection')).toBe(true);
  });
})

describe('isValidEnvironmentName', () => {
  it('rejects empty strings', () => {
    expect(isValidEnvironmentName('')).toBe(false);
  })
  it('rejects >64 char-long', () => {
    expect(isValidEnvironmentName('A'.repeat(65))).toBe(false);
  });
  it('rejects lower case chars', () => {
    expect(isValidEnvironmentName('AAAaA')).toBe(false);
  });
  it('rejects starting with number', () => {
    expect(isValidEnvironmentName('2AAAA')).toBe(false);
  });
  it('accepts starting with an underscore', () => {
    expect(isValidEnvironmentName('_2AAAA')).toBe(true);
  });
  it('accepts starting with letter', () => {
    expect(isValidEnvironmentName('A2_AAA_')).toBe(true);
  });
})

describe('isValidDependencyName', () => {
  it('rejects empty strings', () => {
    expect(isValidDependencyName('')).toBe(false);
  })
  it('rejects "root"', () => {
    expect(isValidDependencyName('root')).toBe(false);
  });
  it('rejects length > 64', () => {
    expect(isValidDependencyName('a'.repeat(64))).toBe(true);
    expect(isValidDependencyName('a'.repeat(65))).toBe(false);
  });
  it('rejects starting with number', () => {
    expect(isValidDependencyName('2aaaa')).toBe(false);
  });
  it('rejects underscores', () => {
    expect(isValidDependencyName('a_aaaa')).toBe(false);
    expect(isValidDependencyName('_aaaaa')).toBe(false);
    expect(isValidDependencyName('aaaa_')).toBe(false);
  });
  it('rejects reserved identifiers', () => {
    expect(isValidDependencyName('false')).toBe(false);
    expect(isValidDependencyName('true')).toBe(false);
    expect(isValidDependencyName('self')).toBe(false);
    expect(isValidDependencyName('null')).toBe(false);
    expect(isValidDependencyName('undefined')).toBe(false);
  });
  it('accepts identifier', () => {
    expect(isValidDependencyName('a')).toBe(true);
    expect(isValidDependencyName('validName')).toBe(true);
    expect(isValidDependencyName('aValidIdentifier')).toBe(true);
    expect(isValidDependencyName('truefalse')).toBe(true);
  });
})

describe('isValidTagName', () => {
  it('rejects empty strings', () => {
    expect(isValidTagName('')).toBe(false);
  })
  it('rejects >35 char-long', () => {
    expect(isValidTagName('a'.repeat(36))).toBe(false);
  });
  it('rejects upper case chars', () => {
    expect(isValidTagName('aaaAa')).toBe(false);
  });
  it('rejects starting with number', () => {
    expect(isValidTagName('2aaaa')).toBe(false);
  });
  it('rejects underscores', () => {
    expect(isValidTagName('aa_aa')).toBe(false);
  });
  it('rejects more than one dash together', () => {
    expect(isValidTagName('a--a')).toBe(false);
  });
  it('rejects leading dashes', () => {
    expect(isValidTagName('-a')).toBe(false);
  });
  it('rejects trailing dashes', () => {
    expect(isValidTagName('a-')).toBe(false);
  });
  it('accepts dashes as separators', () => {
    expect(isValidTagName('a-a-a-a-a')).toBe(true);
  });
  it('accepts a complex tag name', () => {
    expect(isValidTagName('valid-tag-name-for-1337-things')).toBe(true);
  });
})

describe('deepClone', () => {
  it('handles null', () => {
    expect(deepClone(null)).toBe(null);
  });

  it('handles undefined', () => {
    expect(deepClone()).toBe();
  });

  it('handles numbers', () => {
    expect(deepClone(1)).toBe(1);
  });

  it('handles strings', () => {
    expect(deepClone('foo')).toBe('foo');
  });

  it('handles booleans', () => {
    expect(deepClone(true)).toBe(true);
    expect(deepClone(false)).toBe(false);
  });

  it('handles dates', () => {
    const t1 = new Date();
    expect(deepClone(t1).getTime()).toEqual(t1.getTime());
  });

  it('creates a deep copy of an object', () => {
    const t1 = { a: { b:3 }, b: 2, c: 'hi', d: true, e: [{ f: 1 }] };
    expect(deepClone(t1)).toEqual(t1);
    expect(deepClone(t1)).not.toBe(t1);
    expect(deepClone(t1.a)).not.toBe(t1.a);
    expect(deepClone(t1.e)).not.toBe(t1.e);
    expect(deepClone(t1.e[0])).toEqual(t1.e[0]);
    expect(deepClone(t1.e[0])).not.toBe(t1.e[0]);
  });

  it('creates a deep copy of an array', () => {
    const t1 = [{ a: 1 }, false, new Date(), [[], [{ b: 'inner' }]]];
    expect(deepClone(t1)).toEqual(t1);
    expect(deepClone(t1)).not.toBe(t1);
    expect(deepClone(t1[0])).toEqual(t1[0]);
    expect(deepClone(t1[0])).not.toBe(t1[0]);
    expect(deepClone(t1[3])).toEqual(t1[3]);
    expect(deepClone(t1[3])).not.toBe(t1[3]);
    expect(deepClone(t1[3][1])).toEqual(t1[3][1]);
    expect(deepClone(t1[3][1])).not.toBe(t1[3][1]);
  });
});

describe('deepEquals', () => {
  it('null === null', () => {
    expect(deepEquals(null, null)).toBe(true);
  });

  it('undefined === undefined', () => {
    expect(deepEquals(undefined, undefined)).toBe(true);
  });

  it('null !== undefined', () => {
    expect(deepEquals(null, undefined)).toBe(false);
  });

  it('handles strings', () => {
    expect(deepEquals('hi', 'hi')).toBe(true);
  });

  it('handles numbers', () => {
    expect(deepEquals(3.14, 3.14)).toBe(true);
  });

  it('handles booleans', () => {
    expect(deepEquals(false, false)).toBe(true);
    expect(deepEquals(true, true)).toBe(true);
  });

  it('handles Date objects', () => {
    const t1 = new Date();
    const t2 = new Date(t1.getTime());
    const t3 = new Date('1987-10-16');
    expect(deepEquals(t1, t2)).toBe(true);
    expect(deepEquals(t1, t3)).toBe(false);
  });

  it('compare two objects for deep equality', () => {
    const date = new Date();
    const t1 = [{ a: 1 }, false, new Date(date.valueOf()), [[], [{ b: 'inner' }]]];
    const t2 = [{ a: 1 }, false, new Date(date.valueOf()), [[], [{ b: 'inner' }]]];
    expect(deepEquals(t1, t2)).toBe(true);
  });
});

describe('shallowEquals', () => {
  it('null === null', () => {
    expect(shallowEquals(null, null)).toBe(true);
  });

  it('undefined === undefined', () => {
    expect(shallowEquals(undefined, undefined)).toBe(true);
  });

  it('null !== undefined', () => {
    expect(shallowEquals(null, undefined)).toBe(false);
  });

  it('handles strings', () => {
    expect(shallowEquals('hi', 'hi')).toBe(true);
  });

  it('handles numbers', () => {
    expect(shallowEquals(3.14, 3.14)).toBe(true);
  });

  it('handles booleans', () => {
    expect(shallowEquals(false, false)).toBe(true);
    expect(shallowEquals(true, true)).toBe(true);
  });

  it('handles Date objects', () => {
    const t1 = new Date();
    const t2 = new Date(t1.getTime());
    const t3 = new Date('1987-10-16');
    expect(shallowEquals(t1, t2)).toBe(true);
    expect(shallowEquals(t1, t3)).toBe(false);
  });

  it('returns true for objects which are shallowly equal', () => {
    const d1 = new Date();
    const d2 = new Date(d1.getTime());
    const o1 = { a: 1 };
    const o2 = [[], [{ b: 'inner' }]];
    const t1 = { o1, val: false, d1, o2 };
    const t2 = { o1, val: false, d1: d2, o2 };
    expect(shallowEquals(t1, t2)).toBe(true);
  });

  it('returns true for arrays which are shallowly equal', () => {
    const d1 = new Date();
    const d2 = new Date(d1.getTime());
    const o1 = { a: 1 };
    const o2 = [[], [{ b: 'inner' }]];
    const t1 = [o1, false, d1, o2];
    const t2 = [o1, false, d2, o2];
    expect(shallowEquals(t1, t2)).toBe(true);
  });

  it('returns false for arrays which are not shallowly equal', () => {
    const d1 = new Date();
    const d2 = new Date(d1.getTime());
    const o1 = { a: 1 };
    const o2 = [[], [{ b: 'inner' }]];
    const t1 = [o1, true, d1, o2];
    const t2 = [o1, false, d2, o2];
    expect(shallowEquals(t1, t2)).toBe(false);
  });
});

describe('without', () => {
  it('handles null', () => {
    expect(without(null)).toBe(null);
  });

  it('handles undefined', () => {
    expect(without()).toBe();
  });

  it('throws if an invalid type is provided', () => {
    expect(() => without('foo')).toThrow();
  });

  it('returns a shallow-copy of an object without the specified keys', () => {
    const t1 = { a: { b:3 }, b: 2, c: 'hi', d: true };
    const t2 = without(t1, 'b', 'd');

    expect(t2).not.toBe(t1);
    expect(t2).toEqual({
      a: { b: 3},
      c: 'hi',
    });
  });

  it('returns a shallow-copy of an array without the specified elements', () => {
    const t1 = ['hi', 2, 3, 'bye', 'foo'];
    const t2 = without(t1, 2, 'foo');

    expect(t2).not.toBe(t1);
    expect(t2).toEqual(['hi', 3, 'bye']);
  });

  it('returns shallow-copy if the key are not found in the object', () => {
    const t1 = { a: { b:3 }, b: 2, c: 'hi', d: true };
    const t2 = without(t1, 'z', 'w');

    expect(t2).not.toBe(t1);
    expect(t2.a).toBe(t1.a);
    expect(t2.b).toBe(t1.b);
    expect(t2.c).toBe(t1.c);
    expect(t2.d).toBe(t1.d);
    expect(t2).toEqual(t1);
  });
});

describe('isRefTyped', () => {
  it('returns false when a string is provided that is not "Ref"', () => {
    expect(isRefTyped('NotRef')).toBe(false);
  });

  it('returns true when a string is provided that is "Ref"', () => {
    expect(isRefTyped('Ref')).toBe(true);
  });

  it('returns false when a typed object that is not a ref is provided', () => {
    expect(isRefTyped({ type: 'NotRef' })).toBe(false);
  });

  it('returns true when a typed object that is a ref is provided', () => {
    expect(isRefTyped({ type: 'Ref', ofType: 'Thing' })).toBe(true);
  });

  it('returns true when a list of refs is provided', () => {
    expect(isRefTyped({ type: 'List', ofType: { type: 'Ref', ofType: 'Thing' }})).toBe(true);
  })
});

describe('indent', () => {
  it('does not indent empty lines', () => {
    expect(indent('', 2)).toBe('');
    expect(indent('\n', 2)).toBe('\n');
  });

  it('indents a single line', () => {
    expect(indent('one line', 2)).toBe('  one line');
  });

  it('indents multiple lines, skipping empty ones', () => {
    const text = 'line one\nline two\n\nline four\n\n\n';
    expect(indent(text, 2)).toBe('  line one\n  line two\n\n  line four\n\n\n');
  });

  it('accepts a custom indenter', () => {
    expect(indent('line one\nline two', 2, '-->')).toBe('-->-->line one\n-->-->line two');
  });
})

describe('randomHex', () => {
  it('returns a random string of the required length', () => {
    for (let length = 0; length < 24; ++length) {
      for (let i = 0; i < 100; ++i) {
        const str = randomHex(length);
        expect(str.length).toBe(length);
        expect(str).toMatch(/^[a-z0-9]*$/);
      }
    }
  })
});
