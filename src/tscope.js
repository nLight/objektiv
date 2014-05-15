// Creates a shallow copy of source object
function copyObject(source) {
  var copy = {};
  for (var prop in source) {
    copy[prop] = source[prop];
  }
  return copy;
}

function composeLenses(lenses) {
  return lenses.reduce(function(lens1, lens2){
      return Tscope.makeLens(
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
  }, Tscope.full);
}

var Tscope = {resolve: {}, lenses: {}};

Tscope.makeLens = function(getter, setter){
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
    return Tscope.makeTraversal(f, null, pred);
  }

  mixinLenses(f);

  return f;
};


/// Resolvers
Tscope.resolve.strict = function (actions) {
  return Tscope.makeLens(
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

Tscope.resolve.pass = function (actions) {
  return Tscope.makeLens(
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

Tscope.resolve.tryhard = function (actions) {
  return Tscope.makeLens(
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


/// Normal Lenses
Tscope.full = Tscope.makeLens(
  function(a) {return a},
  function(a, val) {return val}
);

Tscope.lenses.at = function(i, resolver) {
  return (resolver || Tscope.resolve.strict)({
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
        var _a = a.slice();
        _a[i] = val;
        return _a;
      },
  });
};

Tscope.lenses.attr = function(name, resolver) {
  return (resolver || Tscope.resolve.strict)({
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
      var o = copyObject(a);
      o[name] = val;
      return o;
    },
  });
};


/// Partial Lenses
Tscope.lenses.partialAttr = function (name) {
  return Tscope.attr(name, Tscope.resolve.pass);
}

Tscope.lenses.partialAt = function(i) {
  return Tscope.at(i, Tscope.resolve.pass);
};


/// Mixin lenses
Object.keys(Tscope.lenses).forEach(function (name) {
  Tscope[name] = Tscope.lenses[name];
});

function mixinLenses(obj) {
  Object.keys(Tscope.lenses).forEach(function (name) {
    obj[name] = function () {
      return obj.then(Tscope.lenses[name].apply(null, arguments));
    }
  });
}


/// Traversals
Tscope.makeTraversal = function (base, item, conds) {
  item = item || Tscope.full;
  conds = conds || [];
  if (typeof conds === 'function') {
    conds = [[conds, Tscope.full]];
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
    return Tscope.makeTraversal(base, item.then.apply(null, arguments), conds);
  }
  t.traversal = function (pred) {
    var t = Tscope.makeTraversal(item, null, pred);
    return Tscope.makeTraversal(base, t, conds);
  }
  t.filter = function (pred) {
    return Tscope.makeTraversal(base, item, conds.concat([[pred, item]]));
  }

  mixinLenses(t);

  return t;
}


/// Cursors
Tscope.makeCursor = function(getter, setter, lens) {
  lens = lens || Tscope.full;

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
    return Tscope.makeCursor(getter, setter, lens.then.apply(null, arguments));
  }
  c.traversal = function (pred) {
    return Tscope.makeCursor(getter, setter, Tscope.makeTraversal(lens, null, pred));
  }

  mixinLenses(c);

  return c;
}

Tscope.dataCursor = function(data, lens) {
  return Tscope.makeCursor(
    function(){return data},
    function(value){data = value},
    lens
  )
}


module.exports = Tscope;
if(typeof window === "object") {
  window.Tscope = Tscope;
}
