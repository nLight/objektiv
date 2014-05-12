// Creates a shallow copy of source object
function copyObject(source) {
  var copy = {};
  for (var prop in source) {
    copy[prop] = source[prop];
  }
  return copy;
}

var Tscope = {o:{}};

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
    return Array.prototype.slice.call(arguments, 0).reduce(function(lens1, lens2){
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
    });
  }.bind(null, f);

  return f;
};

Tscope.at = function(i) {
  var _l = Tscope.makeLens(
    function(a) {
      return a[i];
    },
    function(a, val) {
      var _a = a.slice(0);
      _a[i] = val;
      return _a;
    }
  );
  
  return _l;
};

Tscope.attr = function(name) {
  var createLens = function (name) {
    if (Tscope.o.hasOwnProperty(name)) {
      return Tscope.o[name];
    };

    var _l = Tscope.makeLens(
      function(a) {
        return a[name];
      },
      function(a, val) {
        var o = copyObject(a || {});
        o[name] = val;
        return o;
      }
    );

    return _l;
  }

  var l = createLens(name);

  if (arguments.length == 1) {
    return l;
  } 
  else {
    return Array.prototype.slice.call(arguments, 1).reduce(function(lens, name){
      return lens.then(createLens(name));
    }, l);
  }
};

Tscope.full = Tscope.makeLens(
  function(a) {return a},
  function(a, val) {return val}
);


/// Traversals
Tscope.makeTraversal = function (listLenses) {
  var t = {};
  t.list = function (a) {
    return listLenses(a).map(function (lens) { return lens.get(a) });
  }
  t.mod = function (a, f) {
    return listLenses(a).reduce(function (prev, lens) {
      return lens.mod(prev, f);
    }, a);
  }
  t.set = function (a, value) {
    return t.mod(a, function () { return value })
  }

  t.then = function () {
  }

  return t;
}

Tscope.lensTraversal = function (base, item) {
  return Tscope.makeTraversal(function (a) {
    var list = base.get(a);
    return list.map(function (_, i) {
      return base.then(Tscope.at(i).then(item));
    })
  })
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
    return lens(getter());
  };
  c.set = function(value) {
    return setter(lens(getter(), value));
  }
  c.mod = function(f) {
    return setter(lens.mod(getter(), f));
    // return c.set(f(c.get()));
  }

  c.then = function() {
    return Tscope.makeCursor(getter, setter, lens.then.apply(null, arguments));
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
