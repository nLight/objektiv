var assert = require("assert")
var Tscope = require("../src/tscope")

describe('Tscope', function(){
  describe('#attr', function() {
    var data = { deep: {data: {structure: 1}} };
  });

  describe('Object property', function(){
    var data = { someField: 1, someValue: 2 };

    describe('when property exists', function() {
      it('returns value of a property', function(){
        assert.equal(1, Tscope.attr('someField')(data));
      });

      it('sets a value of a property', function() {
        assert.deepEqual(Tscope.attr('someField')(data, 2), { someField: 2, someValue: 2 });
      });

      it('modifies a value of a property', function() {
        var incr = function(x){ return x + 1};
        assert.deepEqual(Tscope.attr('someField').mod(data, incr), { someField: 2, someValue:2 });
      });
    });

    describe('when property not found', function() {
      it("throws a TypeError on get", function() {
        assert.throws(function(){
          Tscope.attr('not_found').get(data);
        }, TypeError, "Property 'not_found' doesn't exist!");
      });

      it("throws a TypeError on set", function() {
        assert.throws(function(){
          Tscope.attr('not_found').set(data, 2);
        }, TypeError, "Property 'not_found' doesn't exist!");
      });

      it("throws a TypeError on mod", function() {
        var incr = function(x){ return x + 1};

        assert.throws(function(){
          Tscope.attr('not_found').mod(data, incr);
        }, TypeError, "Property 'not_found' doesn't exist!");
      });
    });
  });

  describe('Partial lens', function() {
    describe('for an object property', function() {
      var data = { someField: 1, someValue: 2 };

      describe('when property not found', function() {
        it('returns undefined on get', function() {
          assert.equal(Tscope.partialAttr('not_found').get(data), undefined);
        });
        it('returns unchanged copy on an Object on set', function() {
          assert.deepEqual(Tscope.partialAttr('not_found').set(data, 1), { someField: 1, someValue: 2 });
        });
      });
    });

    describe('for an array element', function() {
      var data = [1, 2, 3];

      describe('when an index not found', function() {
        it('returns undefined on get', function() {
          assert.equal(Tscope.partialAt(100).get(data), undefined);
        });
        it('returns unchanged copy of an array on set', function() {
          assert.deepEqual(Tscope.partialAt(100).set(data, 1), [1, 2, 3]);
        });
      });
    });
  });

  describe('Tryhard resolver', function() {
    var data = { some: 1 };
    var lens = Tscope.attr('not_found', Tscope.resolve.tryhard);

    describe('when property not found', function() {
      it('returns undefined on get', function() {
        assert.equal(lens.get(data), undefined);
      });
      it('creates attr on set', function() {
        assert.deepEqual(lens.set(data, 1), {some: 1, not_found: 1});
      });
    });
  });

  describe('Deep tryhard resolver', function() {
    var data = { some: 1 };
    var lens = Tscope.attr('not_found', Tscope.resolve.tryhard);
    var deep = lens.then(lens);

    describe('when property not found', function() {
      it('returns undefined on get', function() {
        assert.equal(deep.get(data), undefined);
      });
      it('does nothing on set', function() {
        assert.deepEqual(deep.set(data, 1), {some: 1});
      });
    });
  });

  describe('Array element', function(){
    var data = [1, 2, 3];

    describe('when element with index exists in array', function() {
      it('returns value of array', function(){
        assert.equal(1, Tscope.at(0)(data));
      });

      it('sets a value of a property', function() {
        assert.deepEqual(Tscope.at(1)(data, 4), [1, 4, 3]);
      });
    });

    describe('when element with index not exists in array', function() {
      it('throws a TypeError on get', function(){
        assert.throws(function(){
          Tscope.at(100).get(data);
        }, TypeError, "Element with index 100 not found in the array!");
      });

      it('throws a TypeError on set', function() {
        assert.throws(function(){
          Tscope.at(100).set(data, 1);
        }, TypeError, "Property 'not_found' doesn't exist!");
      });
    });
  });

  describe('Composition', function() {
    var data = { someField: [1, 2, {foo: 10}] };

    it('Composes two lenses', function() {
      assert.deepEqual(1,  Tscope.attr('someField').then(Tscope.at(0))(data));
    });

    it('Composes arbitrary number of lenses', function() {
      var composition = Tscope.attr('someField').then(Tscope.at(2), Tscope.attr('foo'))
      assert.deepEqual(10,  composition(data));
    });
  });

  describe('Aliases', function() {
    var data = [1, 2, 3];

    it('has get alias', function() {
      assert.equal(Tscope.at(0).get(data), Tscope.at(0)(data));
    });

    it('has set alias', function() {
      assert.deepEqual(Tscope.at(0).set(data, 5), Tscope.at(0)(data, 5));
    });
  });

  describe('Cursor', function() {
    var data = {deep: {data: 1}};
    var lens = Tscope.attr('deep').then(Tscope.attr('data'));

    it('works', function() {
      var deepCursor = Tscope.dataCursor(data, lens);
      assert.equal(1, deepCursor.get());
      deepCursor.set(2);
      assert.equal(2, deepCursor.get());
      deepCursor.mod(function (x) {return x + 1});
      assert.equal(3, deepCursor.get());
    });

    it('composes', function() {
      var fullCursor = Tscope.dataCursor(data);
      var deepCursor = fullCursor.then(lens);
      assert.equal(1, deepCursor.get());
    });
  });

  describe('Traversed cursors', function() {
    var data = [{x: 0, y: 9}, {x: 1, y: 8}, {x: 2, y: 7}];
    var fullCursor, cursor;

    beforeEach(function reset(){
      fullCursor = Tscope.dataCursor(data);
      cursor = fullCursor.traversal().then(Tscope.attr('x'));
    });

    it('get traversed x', function() {
      assert.deepEqual(cursor(), [0, 1, 2]);
    });

    it('set traversed x', function() {
      cursor(42);
      assert.deepEqual(fullCursor(), [{x: 42, y: 9}, {x: 42, y: 8}, {x: 42, y: 7}]);
    });

    it('modifies values over traversed x', function() {
      cursor.mod(function (x) {return x + 1});
      assert.deepEqual(fullCursor(), [{x: 1, y: 9}, {x: 2, y: 8}, {x: 3, y: 7}]);
    });
  });
})
