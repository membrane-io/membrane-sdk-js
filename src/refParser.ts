/* eslint-disable no-constant-condition */
// TODO: Commenting assertions out because it breaks our hacky boilerplate building process
// const assert = require('assert');

const kMaxRefLength = 2 * 1024;

export class RefSyntaxError extends Error {
  _location: number;
  _ref: string;

  constructor(ref: string, location: number, message: string) {
    super(message);
    if (typeof ref !== "string") {
      throw new Error("Expected ref to be a string");
    }
    if (typeof location !== "number" || Math.floor(location) !== location) {
      throw new Error("Expected location to be an integer");
    }
    this._location = location;
    this._ref = ref;
  }
}

export class RefParser {
  position: number;
  str: string;
  code: number;
  char: string;

  constructor(str) {
    if (typeof str !== "string") {
      throw new Error("Expected ref to be a string");
    }
    if (str.length > kMaxRefLength) {
      throw new Error(`Max ref length is currently capped at ${kMaxRefLength}`);
    }
    this.position = 0;
    this.str = str || "";
    this._updateChar();
  }

  _updateChar() {
    if (this.position >= this.str.length) {
      this.code = 0;
      this.char = "";
    } else {
      this.code = this.str.charCodeAt(this.position);
      this.char = this.str[this.position];
    }
  }

  advance(node) {
    if (typeof node === "number") {
      this.position += node;
    } else {
      this.position = node.loc.end;
    }
    this._updateChar();
  }

  setPosition(position) {
    this.position = position;
    this._updateChar();
  }

  syntaxError(message) {
    const m =
      message + " at position " + this.position + ' in "' + this.str + '"';
    throw new RefSyntaxError(this.str, this.position, m);
  }

  // Returns an AST representation of the ref
  parse() {
    return this.parseRef();
  }

  parseInnerRef() {
    if (this.char !== ("(" as any)) {
      throw this.syntaxError(`Expected '('`);
    }
    this.advance(1);

    const result = this.parseRef();

    if (this.char !== (")" as any)) {
      throw this.syntaxError(`Expected ')'`);
    }
    this.advance(1);
    return result;
  }

  parseRef() {
    const program = this.parseProgram();

    // At this point we must be in a colon or the end of the ref
    let path;
    if (this.char === ":") {
      this.advance(1);
      path = this.parsePath();
      // } else if (this.isEndOfRef()) {
      //   path = {
      //     value: [],
      //     loc: { start: 0, end: 0 },
      //   };
    } else {
      throw this.syntaxError(`Expected ":"`);
    }

    return { program, path };
  }

  parseProgram() {
    const start = this.position;

    let name;
    if (
      isLowerCase(this.code) ||
      isDigit(this.code) ||
      this.code === _POUND ||
      this.code === _AT
    ) {
      name = this.parseProgramIdentifier();
    } else {
      name = { value: "" };
    }

    return {
      loc: { start, end: this.position },
      value: name.value,
    };
  }

  parseIdentifier() {
    const start = this.position;
    if (!isLowerCase(this.str.charCodeAt(this.position))) {
      throw this.syntaxError(`Expected identifier`);
    }
    this.advance(1);

    while (isIdentifierChar(this.code)) {
      this.advance(1);
    }

    return {
      loc: { start, end: this.position },
      value: this.str.substring(start, this.position),
    };
  }

  // Same as parseIdentifier but accepts "-" and can start with digits for UUIDs
  // or '#' for tags
  parseProgramIdentifier() {
    const start = this.position;
    if (
      !isLowerCase(this.code) &&
      !isDigit(this.code) &&
      this.code !== (_POUND as any)
    ) {
      throw this.syntaxError(`Expected program identifier`);
    }

    let isTag = this.code === _POUND;
    this.advance(1);

    if (isTag) {
      if (!isLowerCase(this.code)) {
        throw this.syntaxError(`Tags must begin with a lower case`);
      }
      this.advance(1);
    }

    let minus = false;
    let at = false;
    while (
      isIdentifierChar(this.code) ||
      this.code === _MINUS ||
      this.code === _AT
    ) {
      // Only one dash in a row
      if (this.code === _MINUS && minus) {
        throw this.syntaxError(`Root names cannot have two "-" in sequence`);
      }
      minus = this.code === _MINUS;

      // Only one @ in the program identifier
      if (this.code === _AT) {
        if (at) {
          throw this.syntaxError(`Ref root cannot have more than one "@"`);
        }
        at = true;
      }

      this.advance(1);
    }

    if (minus) {
      throw this.syntaxError(`Root names cannot end with "-"`);
    }

    return {
      loc: { start, end: this.position },
      value: this.str.substring(start, this.position),
    };
  }

  isEndOfRef() {
    return this.position >= this.str.length || this.code === _PARENCLOSE;
  }

  parsePath() {
    const start = this.position;

    const value = [];
    while (!this.isEndOfRef()) {
      if (this.char === ".") {
        this.advance(1);
      } else if (this.position !== start) {
        const last = value[value.length - 1];
        if (last && last.args === null) {
          throw this.syntaxError(`Expected '.', arguments list, or end of ref`);
        }
        throw this.syntaxError(`Expected '.' or end of ref`);
      }

      const elem: any = {};
      elem.name = this.parseIdentifier();
      elem.args = this.tryParseArgs();
      value.push(elem);
    }

    const loc = { start, end: this.position };
    return { loc, value };
  }

  tryParseArgs() {
    const start = this.position;
    const value = [];
    if (this.char !== "(") {
      return { start, end: start, value };
    }
    this.advance(1);

    while (true) {
      let arg: any = {};
      arg.name = this.parseIdentifier();

      if (this.char !== (":" as any)) {
        throw this.syntaxError(`Expected ':'`);
      }
      this.advance(1);

      arg.value = this.tryParseArgValue();
      if (!arg.value) {
        throw this.syntaxError(`Expected valid argument value`);
      }
      this.advance(arg.value);
      value.push(arg);

      if (this.char === (")" as any)) {
        // We've reached the end of this argument list
        break;
      }

      if (this.char !== ("," as any)) {
        throw this.syntaxError(`Expected ',' or ')'`);
      }
      this.advance(1);
    }

    if (this.char !== (")" as any)) {
      throw this.syntaxError(`Expected ')'`);
    }
    this.advance(1);

    const loc = { start, end: this.position };
    return { loc, value };
  }

  tryParseArgValue() {
    const start = this.position;
    let value;
    let type;

    if (this.code === _PARENOPEN) {
      type = "ref";
      value = this.parseInnerRef();
    } else if (this.code === _DOUBLEQUOTES) {
      type = "string";
      value = this.parseStringLiteral();
    } else if (isNumberChar(this.code)) {
      type = "number";
      value = this.parseNumberLiteral();
    } else if (this.lookAhead("true") || this.lookAhead("false")) {
      type = "boolean";
      value = this.parseBooleanLiteral();
    } else {
      return null;
    }

    const loc = { start, end: this.position };
    return { loc, value, type };
  }

  lookAhead(text) {
    return this.str.substr(this.position, text.length) === text;
  }

  // Mostly taken from graphql-js@07cc624 since it must match the GraphQL spec
  parseStringLiteral() {
    // assert.equal(this.code, _DOUBLEQUOTES);
    this.advance(1);

    // TODO: this could be done with buffers but in the general case it
    // shouldn't generate too much garbage unless there are a lot of
    // backslashes. Concatenating strings is easier though
    let value = "";
    let pieceStart = this.position;
    while (
      this.position < this.str.length &&
      this.code !== 0 &&
      this.code !== 0x000a &&
      this.code !== 0x000d &&
      this.code !== _DOUBLEQUOTES
    ) {
      if (this.code < 0x0020 && this.code !== 0x0009) {
        throw this.syntaxError(`Invalid character within String: ${this.char}`);
      }

      if (this.code === _BACKSLASH) {
        value += this.str.substring(pieceStart, this.position);

        // Skip the backslash
        this.advance(1);
        switch (this.code) {
          case 34:
            value += '"';
            break;
          case 47:
            value += "/";
            break;
          case 92:
            value += "\\";
            break;
          case 98:
            value += "\b";
            break;
          case 102:
            value += "\f";
            break;
          case 110:
            value += "\n";
            break;
          case 114:
            value += "\r";
            break;
          case 116:
            value += "\t";
            break;
          case 117: // u
            // eslint-disable-next-line no-case-declarations
            const charCode = uniCharCode(
              this.str.charCodeAt(this.position + 1),
              this.str.charCodeAt(this.position + 2),
              this.str.charCodeAt(this.position + 3),
              this.str.charCodeAt(this.position + 4)
            );
            if (charCode < 0) {
              throw this.syntaxError(
                "Invalid character escape sequence: " +
                  `\\u${this.str.slice(this.position + 1, this.position + 5)}.`
              );
            }
            value += String.fromCharCode(charCode);
            this.advance(4);
            break;
          default:
            throw this.syntaxError(
              `Invalid character escape sequence: \\${this.char}.`
            );
        }

        // Skip one more the get out of the escape sequence
        this.advance(1);
        pieceStart = this.position;
      } else {
        this.advance(1);
      }
    }

    value += this.str.substring(pieceStart, this.position);

    if (this.code !== _DOUBLEQUOTES) {
      throw this.syntaxError(`Unterminated string`);
    }
    this.advance(1);

    return value;
  }

  // Mostly taken from graphql-js@07cc624 since it's battle tested and must
  // match the GraphQL spec
  parseNumberLiteral() {
    let start = this.position;

    if (this.code === _MINUS) {
      this.advance(1);
    }

    if (this.code === _0) {
      this.advance(1);
      if (this.code >= 48 && this.code <= 57) {
        throw this.syntaxError(
          `Invalid number, unexpected digit after 0: ${this.char}.`
        );
      }
    } else {
      this.skipDigits();
    }

    if (this.code === _PERIOD) {
      this.advance(1);
      this.skipDigits();
    }

    if (this.code === _E || this.code === _e) {
      this.advance(1);
      if (this.code === _PLUS || this.code === _MINUS) {
        this.advance(1);
      }
      this.skipDigits();
    }

    return Number(this.str.substring(start, this.position));
  }

  // Advances the parser by skiping digits
  skipDigits() {
    if (this.code >= _0 && this.code <= _9) {
      do {
        this.advance(1);
      } while (this.code >= _0 && this.code <= _9);
      return;
    }
    throw this.syntaxError(
      `Invalid number, expected digit but got: ${this.char}.`
    );
  }

  parseBooleanLiteral() {
    let start = this.position;
    this.advance(4);

    if (this.str.substring(start, this.position) === "true") {
      return true;
    }

    this.advance(1);
    if (this.str.substring(start, this.position) === "false") {
      return false;
    }

    throw this.syntaxError(`Expected boolean literal`);
  }
}

const _DOUBLEQUOTES = '"'.charCodeAt(0);
const _BACKSLASH = "\\".charCodeAt(0);
const _PERIOD = ".".charCodeAt(0);
const _PLUS = "+".charCodeAt(0);
const _MINUS = "-".charCodeAt(0);
const _UNDERSCORE = "_".charCodeAt(0);
const _POUND = "#".charCodeAt(0);
const _AT = "@".charCodeAt(0);
const _PARENOPEN = "(".charCodeAt(0);
const _PARENCLOSE = ")".charCodeAt(0);
const _E = "E".charCodeAt(0);
const _e = "e".charCodeAt(0);
const _0 = "0".charCodeAt(0);
const _9 = "9".charCodeAt(0);
const _A = "A".charCodeAt(0);
const _Z = "Z".charCodeAt(0);
const _a = "a".charCodeAt(0);
const _z = "z".charCodeAt(0);

function isUpperCase(charCode) {
  return charCode >= _A && charCode <= _Z;
}

function isLowerCase(charCode) {
  return charCode >= _a && charCode <= _z;
}

function isDigit(charCode) {
  return charCode >= _0 && charCode <= _9;
}

function isNumberChar(charCode) {
  return (charCode >= _0 && charCode <= _9) || charCode === _MINUS;
}

function uniCharCode(a, b, c, d) {
  return (
    (char2hex(a) << 12) | (char2hex(b) << 8) | (char2hex(c) << 4) | char2hex(d)
  );
}

function isUnderscore(charCode) {
  return charCode === _UNDERSCORE;
}

function char2hex(a) {
  return a >= 48 && a <= 57
    ? a - 48 // 0-9
    : a >= 65 && a <= 70
    ? a - 55 // A-F
    : a >= 97 && a <= 102
    ? a - 87 // a-f
    : -1;
}

function isIdentifierChar(charCode) {
  return (
    isUpperCase(charCode) ||
    isLowerCase(charCode) ||
    isDigit(charCode) ||
    isUnderscore(charCode)
  );
}
