function composeLenses(lenses) {
  return lenses.reduce(function(lens1, lens2) {
    return Objektiv.makeLens(
      function(data) {
        const data1 = lens1(data);
        return lens2(data1);
      },
      function(data, value) {
        const data1 = lens1(data);
        const value1 = lens2(data1, value);
        return lens1(data, value1);
      }
    );
  }, Objektiv.identity);
}

const Objektiv = { resolve: {}, lenses: {} };

Objektiv.makeLens = function(getter, setter, describe) {
  const lens = function() {
    if (arguments.length == 1) {
      return getter.apply(this, arguments);
    } else if (arguments.length == 2) {
      return setter.apply(this, arguments);
    }
  };

  lens.describe = describe;
  lens.get = getter; // lens(data) = lens.get(data);
  lens.set = setter; // lens(data, value) = lens.set(data, value);

  lens.mod = (data, predicate) => setter(data, predicate(getter(data)));
  lens.then = (...args) => composeLenses([lens, ...args]);
  lens.traversal = predicate =>
    Objektiv.makeTraversal(lens, Objektiv.identity, predicate);

  mixinLenses(lens);

  return lens;
};

/// Resolvers
// Strict resolver.
// throws if path can not be resolved in the object
Objektiv.resolve.strict = function({ check, get, set, describe }) {
  return Objektiv.makeLens(
    function(data) {
      const error = check(data);
      if (error) throw error;
      return get(data);
    },
    function(data, value) {
      const error = check(data);
      if (error) throw error;
      return set(data, value);
    },
    describe
  );
};

// Partial resolver
// get - returns undefined if path can't be resolved
// set - returns data unchanged if path can't be resolved
Objektiv.resolve.partial = function({ check, get, set, describe }) {
  return Objektiv.makeLens(
    function(data) {
      const error = check(data);
      if (error) return undefined;
      return get(data);
    },
    function(data, value) {
      const error = check(data);
      if (error) return data;
      return set(data, value);
    },
    describe
  );
};

// Try hard resolver
// get - returns undefined if path can't be resolved
// set - sets the value at the path
Objektiv.resolve.tryhard = function({ check, get, set, describe }) {
  return Objektiv.makeLens(
    function(data) {
      const error = check(data);
      if (error) return undefined;
      return get(data);
    },
    set,
    describe
  );
};

// Fallback resolver
// get - returns default value if path can't be resolved
Objektiv.resolve.fallback = function(defaultValue) {
  return function({ check, get, set, describe }) {
    return Objektiv.makeLens(
      function(data) {
        const error = check(data);
        if (error) return defaultValue;
        return get(data);
      },
      set,
      describe
    );
  };
};

// Low-level lens constructors
Objektiv.makeAtLens = function(i, resolver) {
  return resolver({
    describe: i,
    check: function(a) {
      if (a === undefined) {
        return TypeError("Data is undefined!");
      } else if (a[i] === undefined) {
        return TypeError(
          "Element with index " + i + " not found in the array!"
        );
      }
    },
    get: data => data[i],
    set: (data, value) => {
      const copy = (data || []).slice(0);
      copy[i] = value;
      return copy;
    }
  });
};

Objektiv.makeAttrLens = function(name, resolver) {
  return resolver({
    describe: name,
    check(data) {
      if (data === undefined) {
        return TypeError("Data is undefined!");
      } else if (!data.hasOwnProperty(name)) {
        return TypeError("Property '" + name + "' doesn't exist!");
      }
    },
    get: data => data[name],
    set: (data, value) => ({ ...data, [name]: value })
  });
};

/// Normal Lenses
Objektiv.identity = Objektiv.makeLens(data => data, (data, value) => value);

Objektiv.lenses.at = function(i, defaultValue) {
  const resolver =
    arguments.length === 1
      ? Objektiv.resolve.strict
      : Objektiv.resolve.fallback(defaultValue);
  return Objektiv.makeAtLens(i, resolver);
};

Objektiv.lenses.attr = function(name, defaultValue) {
  const resolver =
    arguments.length === 1
      ? Objektiv.resolve.strict
      : Objektiv.resolve.fallback(defaultValue);
  return Objektiv.makeAttrLens(name, resolver);
};

/// Partial Lenses
Objektiv.lenses.partialAt = function(i) {
  return Objektiv.makeAtLens(i, Objektiv.resolve.partial);
};

Objektiv.lenses.partialAttr = function(name) {
  return Objektiv.makeAttrLens(name, Objektiv.resolve.partial);
};

/// Mixin lenses
Object.keys(Objektiv.lenses).forEach(function(name) {
  Objektiv[name] = Objektiv.lenses[name];
});

function mixinLenses(obj) {
  Object.keys(Objektiv.lenses).forEach(function(name) {
    obj[name] = function() {
      return obj.then(Objektiv.lenses[name].apply(null, arguments));
    };
  });
}

/// Traversals
Objektiv.makeTraversal = function(
  base,
  item = Objektiv.identity,
  conditionals = []
) {
  if (typeof conditionals === "function") {
    conditionals = [[conditionals, Objektiv.identity]];
  }

  function applyConditionals(data, i) {
    return conditionals.every(([predicate, lens]) => predicate(lens(data), i));
  }

  const traversal = {};
  traversal.get = data =>
    base(data)
      .filter(applyConditionals)
      .map(item.get);

  traversal.mod = function(data, predicate) {
    const list = base(data).map(function(data1, i) {
      if (applyConditionals(data1, i)) {
        return item.mod(data1, predicate);
      } else {
        return data1;
      }
    });
    return base.set(data, list);
  };
  traversal.set = (data, value) => traversal.mod(data, () => value);

  traversal.then = (...args) =>
    Objektiv.makeTraversal(base, item.then.apply(null, args), conditionals);

  traversal.traversal = function(predicate) {
    const itemTraversal = Objektiv.makeTraversal(
      item,
      Objektiv.identity,
      predicate
    );
    return Objektiv.makeTraversal(base, itemTraversal, conditionals);
  };

  traversal.filter = predicate =>
    Objektiv.makeTraversal(
      base,
      item,
      conditionals.concat([[predicate, item]])
    );

  mixinLenses(traversal);

  return traversal;
};

/// Cursors
Objektiv.makeCursor = function(getter, setter, lens) {
  lens = lens || Objektiv.identity;

  const cursor = value =>
    value === undefined ? cursor.get() : cursor.set(value);

  cursor.get = () => lens.get(getter());
  cursor.set = value => setter(lens.set(getter(), value));
  cursor.mod = predicate => setter(lens.mod(getter(), predicate));

  cursor.then = (...args) =>
    Objektiv.makeCursor(getter, setter, lens.then.apply(null, args));

  cursor.traversal = predicate =>
    Objektiv.makeCursor(
      getter,
      setter,
      Objektiv.makeTraversal(lens, Objektiv.identity, predicate)
    );

  mixinLenses(cursor);

  cursor.map = function(callback) {
    return cursor.get().map(function(_, i) {
      return callback(cursor.at(i), i, cursor);
    });
  };

  return cursor;
};

Objektiv.dataCursor = function(data, callback) {
  const updateCallbacks = [];

  const onUpdate = function(callback) {
    updateCallbacks.push(callback);
  };

  if (callback) {
    onUpdate(callback);
  }

  const setter = function(value) {
    updateCallbacks.forEach(function(callback) {
      callback(value, data);
    });

    data = value;
  };

  const cursor = Objektiv.makeCursor(() => data, setter);

  cursor.onUpdate = onUpdate;

  return cursor;
};

module.exports = Objektiv;
