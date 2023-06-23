import { arrayEquals } from './';

// Version of matchesInterface that memoizes its results. This is needed to
// handle recursive interfaces and of course make the check in some cases faster
function createMemoized() {
  // Map interface types to types that match it
  const matchMap = new Map();
  const memoized = (traversal, iTraversal, mismatches) => {
    const type = traversal.type;
    const iType = iTraversal.type;
    let matches = matchMap.get(iType);
    if (!matches) {
      matches = new Set();
      matchMap.set(iType, matches);
    }
    if (matches.has(type)) {
      return true;
    }

    // Set this before actually checking if the types match so that the
    // recursive case works
    matches.add(type);
    return matchesInterface(traversal, iTraversal, mismatches, memoized);
  };
  return memoized;
}

function matchesMember(traversal, iTraversal, memberName, mismatches, memoized) {
  try {
    const parentType = traversal.type;
    const iParentType = iTraversal.type;
    iTraversal.enterMember(memberName);
    if (traversal.enterMember(memberName)) {
      try {
        const { type, wrappers } = traversal;
        const { type: iType, wrappers: iWrappers } = iTraversal;

        if (!arrayEquals(wrappers, iWrappers)) {
          if (mismatches) {
            mismatches.push(`Type of ${parentType.name}.${memberName} (${type.name}) does ` +
            `not match interface ${iParentType.name}.${memberName} (${iType.name})`);
          }
          return false;
        }

        // For when the interface is defined in the same schema
        if (iType === type) {
          return true;
        }

        // Scalars can be checked by name
        if (iTraversal.isScalar()) {
          const isMatch = iType.name === 'Void' || type.name === iType.name;
          if (!isMatch) {
            if (mismatches) {
              mismatches.push(`Type of ${parentType.name}.${memberName} (${type.name}) ` +
              `does not match interface ${iParentType.name}.${memberName} (${iType.name})`);
            }
          }
          return isMatch;
        }

        // Object types must be recursively checked
        return memoized(traversal, iTraversal, mismatches);
      } finally {
        traversal.pop();
      }
    } else {
      if (mismatches) {
        mismatches.push(`Type ${parentType.name} has no member named ${memberName} while matching against ${iParentType.name}`);
      }
      return false;
    }
  } finally {
    iTraversal.pop();
  }
  // Unreachable
}

// Returns whether the type of the provided traversal implements the provided
// interface
// TODO: unit tests
export default function matchesInterface(traversal, iTraversal, mismatches, memoized = createMemoized()) {
  const {
    fields = [],
    computedFields = [],
    actions = [],
    events = [],
  } = iTraversal.type;

  for (let f of fields) {
    if (!matchesMember(traversal, iTraversal, f.name, mismatches, memoized)) {
      if (!mismatches) {
        return false;
      }
    }
  }
  for (let f of computedFields) {
    if (!matchesMember(traversal, iTraversal, f.name, mismatches, memoized)) {
      if (!mismatches) {
        return false;
      }
    }
  }
  for (let f of actions) {
    if (!matchesMember(traversal, iTraversal, f.name, mismatches, memoized)) {
      if (!mismatches) {
        return false;
      }
    }
  }
  for (let f of events) {
    if (!matchesMember(traversal, iTraversal, f.name, mismatches, memoized)) {
      if (!mismatches) {
        return false;
      }
    }
  }
  if (mismatches && mismatches.length) {
    return false;
  }
  return true;
}
