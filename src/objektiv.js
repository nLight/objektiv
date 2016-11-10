function composeLenses(lenses) {
  return lenses.reduce(function(lens1, lens2){
      return Objektiv.makeLens(
        function(a) {
          var _a = lens1(a);
          return lens2(_a);
        },
        function(a, val) {
          var _a = lens1(a);
          var _val = lens2(_a, val);
          return lens1(a, _val);
        }
      );
  }, Objektiv.full);
}

var Objektiv = {resolve: {}, lenses: {}};

Objektiv.makeLens = function(getter, setter){
  var f = function(){
    if (arguments.length == 1) {
      return getter.apply(this, arguments);
    }
    else if(arguments.length == 2) {
      return setter.apply(this, arguments);
    };
  };

  f.get = getter; // l(a) = l.get(a);
  f.set = setter; // l(a, val) = l.set(a,val);

  f.mod = function (a, f) {
    return setter(a, f(getter(a)));
  };

  f.then = function() {
    return composeLenses(Array.prototype.slice.call(arguments));
  }.bind(null, f);

  f.traversal = function (pred) {
    return Objektiv.makeTraversal(f, null, pred);
  }

  mixinLenses(f);

  return f;
};


/// Resolvers
Objektiv.resolve.strict = function (actions) {
  return Objektiv.makeLens(
    function (a) {
      var e = actions.check(a);
      if (e) throw e;
      return actions.get(a);
    },
    function (a, val) {
      var e = actions.check(a);
      if (e) throw e;
      return actions.set(a, val);
    }
  );
}

Objektiv.resolve.partial = function (actions) {
  return Objektiv.makeLens(
    function (a) {
      var e = actions.check(a);
      if (e) return undefined;
      return actions.get(a);
    },
    function (a, val) {
      var e = actions.check(a);
      if (e) return a;
      return actions.set(a, val);
    }
  );
}

Objektiv.resolve.tryhard = function (actions) {
  return Objektiv.makeLens(
    function (a) {
      var e = actions.check(a);
      if (e) return undefined;
      return actions.get(a);
    },
    function (a, val) {
      var e = actions.check(a);
      // NOTE: shouldn't examine a and val here,
      //       ideally any action should be derived from error
      if (!e || typeof a !== "undefined" && typeof val !== "undefined") {
        return actions.set(a, val);
      } else {
        return a;
      }
    }
  );
}

Objektiv.resolve.fallback = function (defaultValue) {
  return function (actions) {
    return Objektiv.makeLens(
      function (a) {
        var e = actions.check(a);
        if (e) return defaultValue;
        return actions.get(a);
      },
      actions.set
    )
  }
}


// Low-level lens constructors
Objektiv.makeAtLens = function (i, resolver) {
  return resolver({
    check: function (a) {
      if (typeof a === "undefined") {
        return TypeError("Data is undefined!");
      }
      else if (typeof a[i] === "undefined") {
        return TypeError("Element with index " + i + " not found in the array!");
      }
    },
    get: function (a) {
      return a[i];
    },
    set: function (a, val) {
      var _a = a.slice(0);
      _a[i] = val;
      return _a;
    }
  });
}

Objektiv.makeAttrLens = function(name, resolver) {
  return resolver({
    check: function (a) {
      if (typeof a === "undefined") {
        return TypeError("Data is undefined!");
      }
      else if (!a.hasOwnProperty(name)) {
        return TypeError("Property '" + name + "' doesn't exist!");
      }
    },
    get: function (a) {
      return a[name];
    },
    set: function (a, val) {
      var o = Object.assign({}, a);
      o[name] = val;
      return o;
    }
  })
}


/// Normal Lenses
Objektiv.full = Objektiv.makeLens(
  function(a) {return a},
  function(a, val) {return val}
);

Objektiv.lenses.at = function(i, defaultValue) {
  var resolver = (arguments.length === 1) ? Objektiv.resolve.strict
                                          : Objektiv.resolve.fallback(defaultValue);
  return Objektiv.makeAtLens(i, resolver);
};

Objektiv.lenses.attr = function (name, defaultValue) {
  var resolver = (arguments.length === 1) ? Objektiv.resolve.strict
                                          : Objektiv.resolve.fallback(defaultValue);
  return Objektiv.makeAttrLens(name, resolver);
}


/// Partial Lenses
Objektiv.lenses.partialAt = function (i) {
  return Objektiv.makeAtLens(i, Objektiv.resolve.partial);
}

Objektiv.lenses.partialAttr = function (name) {
  return Objektiv.makeAttrLens(name, Objektiv.resolve.partial);
}


/// Mixin lenses
Object.keys(Objektiv.lenses).forEach(function (name) {
  Objektiv[name] = Objektiv.lenses[name];
});

function mixinLenses(obj) {
  Object.keys(Objektiv.lenses).forEach(function (name) {
    obj[name] = function () {
      return obj.then(Objektiv.lenses[name].apply(null, arguments));
    }
  });
}


/// Traversals
Objektiv.makeTraversal = function (base, item, conds) {
  item = item || Objektiv.full;
  conds = conds || [];
  if (typeof conds === 'function') {
    conds = [[conds, Objektiv.full]];
  }

  function condsMatch(el, i) {
    return conds.every(function (cond) {
      var pred = cond[0], lens = cond[1];
      return pred(lens(el), i);
    })
  }

  var t = {};
  t.get = function (a) {
    var list = base.get(a);
    return list.filter(condsMatch).map(item.get);
  }
  t.mod = function (a, f) {
    var source = base.get(a);
    var list = source.map(function (x, i) {
      if (condsMatch(x, i)) {
        return item.mod(x, f);
      }
      else {
        return x;
      }
    });
    return base.set(a, list);
  }
  t.set = function (a, value) {
    return t.mod(a, function () { return value })
  }

  t.then = function () {
    return Objektiv.makeTraversal(base, item.then.apply(null, arguments), conds);
  }
  t.traversal = function (pred) {
    var t = Objektiv.makeTraversal(item, null, pred);
    return Objektiv.makeTraversal(base, t, conds);
  }
  t.filter = function (pred) {
    return Objektiv.makeTraversal(base, item, conds.concat([[pred, item]]));
  }

  mixinLenses(t);

  return t;
}


/// Cursors
Objektiv.makeCursor = function(getter, setter, lens) {
  lens = lens || Objektiv.full;

  var c = function(value) {
    if (arguments.length === 0) {
      return c.get()
    } else {
      return c.set(value);
    }
  }
  c.get = function() {
    return lens.get(getter());
  };
  c.set = function(value) {
    return setter(lens.set(getter(), value));
  }
  c.mod = function(f) {
    return setter(lens.mod(getter(), f));
  }

  c.then = function() {
    return Objektiv.makeCursor(getter, setter, lens.then.apply(null, arguments));
  }
  c.traversal = function (pred) {
    return Objektiv.makeCursor(getter, setter, Objektiv.makeTraversal(lens, null, pred));
  }

  mixinLenses(c);

  c.map = function(callback) {
    return c.get().map(function (_, i) {
      return callback(c.at(i), i, c);
    });
  }

  return c;
}

Objektiv.dataCursor = function(data, callback) {
  var updateCallbacks = [];

  var onUpdate = function(callback) {
    updateCallbacks.push(callback);
  };

  if (callback) {
    onUpdate(callback);
  }

  var setter = function (value) {
    updateCallbacks.forEach(function(cb){
      cb(value, data);
    });

    data = value;
  }

  var c = Objektiv.makeCursor(
    function(){return data},
    setter
  );

  c.onUpdate = onUpdate;

  return c;
}


module.exports = Objektiv;
if(typeof window === "object") {
  window.Objektiv = Objektiv;
}
