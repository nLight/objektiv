function compose(lenses) {
  return lenses.reduce(function(lens1, lens2) {
    return Objektiv.makeLens(
      data => lens2.get(lens1.get(data)),
      (data, value) => lens1.set(data, lens2.set(lens1.get(data), value)),
      lens2.id,
      [lens1.path, lens2.path]
        .filter(path => path.toString().length > 0)
        .join(".")
    );
  }, Objektiv.identity);
}

const Objektiv = { resolve: {}, lenses: {} };

Objektiv.makeLens = function(getter, setter, id, path) {
  const lens = {
    id,
    path: path || id,
    get: getter,
    set: setter,
    map: (data, predicate) => setter(data, predicate(getter(data))),
    then: (...args) => compose([lens, ...args]),
    traversal: predicate =>
      Objektiv.makeTraversal(lens, Objektiv.identity, predicate)
  };

  mixinLenses(lens);

  return lens;
};

/// Resolvers
// Strict resolver.
// throws if path can not be resolved in the object
Objektiv.resolve.strict = function({ check, get, set, id }) {
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
    id
  );
};

// Partial resolver
// get - returns undefined if path can't be resolved
// set - returns data unchanged if path can't be resolved
Objektiv.resolve.partial = function({ check, get, set, id }) {
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
    id
  );
};

// Try hard resolver
// get - returns undefined if path can't be resolved
// set - sets the value at the path
Objektiv.resolve.tryhard = function({ check, get, set, id }) {
  return Objektiv.makeLens(
    function(data) {
      const error = check(data);
      if (error) return undefined;
      return get(data);
    },
    set,
    id
  );
};

// Fallback resolver
// get - returns default value if path can't be resolved
Objektiv.resolve.fallback = function(defaultValue) {
  return function({ check, get, set, id }) {
    return Objektiv.makeLens(
      function(data) {
        const error = check(data);
        if (error) return defaultValue;
        return get(data);
      },
      set,
      id
    );
  };
};

// Low-level lens constructors
Objektiv.makeAtLens = function(i, resolver) {
  return resolver({
    id: i,
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
    id: name,
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
Objektiv.identity = Objektiv.makeLens(data => data, (data, value) => value, "");

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

  const applyConditionals = (data, i) =>
    conditionals.every(([predicate, lens]) => predicate(lens.get(data), i));

  const traversal = {
    id: `[${item.path}]`,
    path: `${base.path}[${item.path}]`,
    get: data =>
      base
        .get(data)
        .filter(applyConditionals)
        .map(item.get),
    set: (data, value) => traversal.map(data, () => value),
    map: (data, predicate) => {
      const list = base
        .get(data)
        .map((data1, i) =>
          applyConditionals(data1, i) ? item.map(data1, predicate) : data1
        );
      return base.set(data, list);
    },
    then: (...args) =>
      Objektiv.makeTraversal(base, item.then.apply(null, args), conditionals),
    traversal: predicate =>
      Objektiv.makeTraversal(
        base,
        Objektiv.makeTraversal(item, Objektiv.identity, predicate),
        conditionals
      ),
    filter: predicate =>
      Objektiv.makeTraversal(
        base,
        item,
        conditionals.concat([[predicate, item]])
      )
  };

  mixinLenses(traversal);

  return traversal;
};

/// Cursors
Objektiv.makeCursor = function(getter, setter, lens = Objektiv.identity) {
  const cursor = {
    id: lens.id,
    path: lens.path,
    get: () => lens.get(getter()),
    set: value => setter(lens.set(getter(), value)),
    fmap: predicate => setter(lens.map(getter(), predicate)),
    map: predicate =>
      cursor.get().map((_, i) => predicate(cursor.at(i), i, cursor)),
    then: (...args) =>
      Objektiv.makeCursor(getter, setter, lens.then.apply(null, args)),
    traversal: predicate =>
      Objektiv.makeCursor(
        getter,
        setter,
        Objektiv.makeTraversal(lens, Objektiv.identity, predicate)
      )
  };

  mixinLenses(cursor);

  return cursor;
};

Objektiv.dataCursor = function(data, callback) {
  const updateCallbacks = [];

  const onUpdate = callback => updateCallbacks.push(callback);

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
