function extend(obj) {
  Array.prototype.slice.call(arguments, 1).forEach(function(source) {
    if (source) {
      for (var prop in source) {
        if (source[prop].constructor === Object) {
          if (!obj[prop] || obj[prop].constructor === Object) {
            obj[prop] = obj[prop] || {};
            extend(obj[prop], source[prop]);
          } else {
            obj[prop] = source[prop];
          }
        } else {
          obj[prop] = source[prop];
        }
      }
    }
  });
  return obj;
};

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

  f.$ = function(f1, f2) {
    return Tscope.makeLens(
      function(a) {
        var _a = f1(a);
        return f2(_a);
      },
      function(a, val) {
        var _a = f1(a);
        var _val = f2(_a, val);
        return f1(a, _val);
      }
    );
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
  if (Tscope.o.hasOwnProperty(name)) {
    return Tscope.o[name];
  };

  var _l = Tscope.makeLens(
    function(a) {
      return a[name];
    },
    function(a, val) {
      var o = extend({}, o);
      o[name] = val;
      return o;
    }
  );

  return _l;
};

Tscope.makeAll = function() {
  for (var i = arguments.length - 1; i >= 0; i--) {
    var f = arguments[i];
    Tscope.o[f] = Tscope.attr(f);
  };
}

module.exports = Tscope;
