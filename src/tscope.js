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

var Tscope = {};

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

  return f;
};


/// Normal Lenses
Tscope.full = Tscope.makeLens(
  function(a) {return a},
  function(a, val) {return val}
);

Tscope.at = function(i) {
  var _l = Tscope.makeLens(
    function(a) {
      if(typeof a[i] === 'undefined') {
        throw TypeError("Element with index " + i + " not found in the array!");
      }

      return a[i];
    },
    function(a, val) {
      if(typeof a[i] === 'undefined') {
        throw TypeError("Element with index " + i + " not found in the array!");
      }

      var _a = a.slice(0);
      _a[i] = val;
      return _a;
    }
  );

  return _l;
};

Tscope.attr = function(name) {
  return Tscope.makeLens(
    function(a) {
      if (!a.hasOwnProperty(name)) {
        throw TypeError("Property '" + name + "' doesn't exist!");
      }

      return a[name];
    },
    function(a, val) {
      if (!a.hasOwnProperty(name)) {
        throw TypeError("Property '" + name + "' doesn't exist!");
      }

      var o = copyObject(a || {});
      o[name] = val;
      return o;
    }
  );
};


/// Partial Lenses
Tscope.partialAttr = function(name) {
  return Tscope.makeLens(
    function(a) {
      if (typeof a === "undefined") {
        return undefined;
      }

      return a[name];
    },
    function(a, val) {
      if (typeof a === "undefined") {
        return undefined;
      }
      else if (!a.hasOwnProperty(name)) {
        return copyObject(a);
      }

      var o = copyObject(a || {});
      o[name] = val;
      return o;
    }
  );
};

Tscope.partialAt = function(i) {
  var _l = Tscope.makeLens(
    function(a) {
      if(typeof a === 'undefined' || typeof a[i] === 'undefined') {
        return undefined;
      }

      return a[i];
    },
    function(a, val) {
      if(typeof a === 'undefined') {
        return undefined;
      }
      else if (typeof a[i] === 'undefined') {
        return a.slice(0);
      }

      var _a = a.slice(0);
      _a[i] = val;
      return _a;
    }
  );

  return _l;
};


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
