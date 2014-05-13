var assert = require("assert")
var Tscope = require("../src/tscope")

describe('Tscope', function(){
  describe('#attr', function() {
    var data = { deep: {data: {structure: 1}} };

    it('takes arbitrary number of arguments', function() {
      assert.equal(1, Tscope.attr('deep', 'data', 'structure').get(data));
    });
  });

  describe('Object property', function(){
    var data = { someField: 1, someValue: 2 };

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

  describe('Array element', function(){
    var data = [1, 2, 3];

    it('returns value of array', function(){
      assert.equal(1, Tscope.at(0)(data));
    });

    it('sets a value of a property', function() {
      assert.deepEqual(Tscope.at(1)(data, 4), [1, 4, 3]);
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

  describe('Traversal', function() {
    var data = {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 2, y: 7}]};
    var traverse = Tscope.makeTraversal(Tscope.attr('array'), Tscope.attr('x'));
    var traverse_with_filter = Tscope.makeTraversal(Tscope.attr('array'), Tscope.attr('x'),function(point){return point.x == 1;});

    it('get traversed x', function() {
      assert.deepEqual(traverse.get(data), [0, 1, 2]);
      assert.deepEqual(traverse_with_filter.get(data), [1]);
    });

    it('set traversed x', function() {
      assert.deepEqual(traverse.set(data, 6), {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]});
      assert.deepEqual(traverse_with_filter.set(data, 6), {array: [{x: 0, y:9}, {x: 6, y: 8}, {x: 2, y: 7}]});
    });

    it('modifies values over traversed x', function() {
      var incr = function(x){return x + 1};
      assert.deepEqual(traverse.mod(data, incr), {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]});
      assert.deepEqual(traverse_with_filter.mod(data, incr), {array: [{x: 0, y:9}, {x: 2, y: 8}, {x: 2, y: 7}]});
    });
  });

  describe('Traversal composition', function() {
    var data = {circles: [{center: {x: 0, y: 9}, radius: 1},
                          {center: {x: 1, y: 8}, radius: 2},
                          {center: {x: 2, y: 7}, radius: 3}]};
    var traverse = Tscope.makeTraversal(Tscope.attr('circles'), Tscope.attr('center'))
                         .then(Tscope.attr('y'));
    var traverse_with_filter = Tscope.makeTraversal(Tscope.attr('circles'), Tscope.attr('center'), function(circle){return circle.radius == 2;})
                         .then(Tscope.attr('y'));

    it('get traversed x', function() {
      assert.deepEqual(traverse.get(data), [9, 8, 7]);
      assert.deepEqual(traverse_with_filter.get(data), [8]);
    });

    it('modifies values over traversed x', function() {
      var decr = function(x){return x - 1};
      assert.deepEqual(
          traverse.mod(data, decr),
          {circles: [{center: {x: 0, y: 8}, radius: 1},
                     {center: {x: 1, y: 7}, radius: 2},
                     {center: {x: 2, y: 6}, radius: 3}]});
      assert.deepEqual(
          traverse_with_filter.mod(data, decr),
          {circles: [{center: {x: 0, y: 9}, radius: 1},
                     {center: {x: 1, y: 7}, radius: 2},
                     {center: {x: 2, y: 7}, radius: 3}]});

    });
  });

  describe('Nested traversals', function() {
    var users = {
      users: [
        { friends: [{name: 'Bob', email: 'bob@gmail.com'}, {name: 'Alice', email: 'kitty@example.com'}] },
        { friends: [{name: 'Bob', email: 'bobby@example.com'}, {name: 'Josh', email: 'josh@gmail.com'}, {name: 'Bill', email: 'bill@gmail.com'}]}
      ]
    };

    var traversal = Tscope.makeTraversal(Tscope.attr('users'), Tscope.attr('friends'));
    var deepTraversal = traversal.traversal().then(Tscope.attr('name'));
    var deepTraversal_with_filter = traversal.traversal(Tscope.attr('name'),
      function(friend){
        return friend.email.indexOf('gmail.com') != -1
      });

    it('list data', function() {
      assert.deepEqual(deepTraversal.get(users), [["Bob","Alice"],["Bob","Josh","Bill"]]);
      assert.deepEqual(deepTraversal_with_filter.get(users), [["Bob"],["Josh","Bill"]]);
    });

    it('modify data', function() {
      var toUpper = function (s) { return s.toUpperCase() }
      assert.deepEqual(deepTraversal.mod(users, toUpper), {
        users: [
          { friends: [{name: 'BOB', email: 'bob@gmail.com'}, {name: 'ALICE', email: 'kitty@example.com'}] },
          { friends: [{name: 'BOB', email: 'bobby@example.com'}, {name: 'JOSH', email: 'josh@gmail.com'}, {name: 'BILL', email: 'bill@gmail.com'}]}
        ]
      });
      assert.deepEqual(deepTraversal_with_filter.mod(users, toUpper), {
        users: [
          { friends: [{name: 'BOB', email: 'bob@gmail.com'}, {name: 'Alice', email: 'kitty@example.com'}] },
          { friends: [{name: 'Bob', email: 'bobby@example.com'}, {name: 'JOSH', email: 'josh@gmail.com'}, {name: 'BILL', email: 'bill@gmail.com'}]}
        ]
      });

    });
  });

  describe('Cursor', function() {
    var data = {deep: {data: 1}};
    var lens = Tscope.attr('deep', 'data')

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
      cursor = fullCursor.traversal(Tscope.attr('x'));
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
