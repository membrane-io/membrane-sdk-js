/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { expect } from "@jest/globals";
import type { MatcherFunction } from "expect";
import * as Immutable from "immutable";

type Matcher = {
  pass: boolean;
  message: () => string;
};

const comparator = <T>(func: T): T => func;

const toString = function (obj: object): string | object {
  return obj && typeof obj.toString === "function" ? obj.toString() : obj;
};

const toEqualImmutable: MatcherFunction<[ref: unknown]> = comparator(
  (actual: any, expected: any): Matcher => {
    const pass = Immutable.is(actual, expected);
    const message = (): string =>
      `Expected ${toString(actual)} ${pass ? " not" : ""} to equal ${toString(
        expected
      )}`;
    return { pass, message };
  }
);

expect.extend({
  toEqualImmutable,
});

declare module "expect" {
  interface AsymmetricMatchers {
    toEqualImmutable(ref: any): void;
  }
  interface Matchers<R> {
    toEqualImmutable(ref: any): R;
  }
}
