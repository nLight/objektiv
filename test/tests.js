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

    it('get traversed x', function() {
      assert.deepEqual(traverse.list(data), [0, 1, 2]);
    });

    it('set traversed x', function() {
      assert.deepEqual(traverse.set(data, 6), {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]});
    });

    it('modifies values over traversed x', function() {
      var incr = function(x){return x + 1};
      assert.deepEqual(traverse.mod(data, incr), {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]});
    });
  });

  describe('Traversal composition', function() {
    var data = {circles: [{center: {x: 0, y: 9}, radius: 1},
                          {center: {x: 1, y: 8}, radius: 2},
                          {center: {x: 2, y: 7}, radius: 3}]};
    var traverse = Tscope.makeTraversal(Tscope.attr('circles'), Tscope.attr('center'))
                         .then(Tscope.attr('y'));

    it('get traversed x', function() {
      assert.deepEqual(traverse.list(data), [9, 8, 7]);
    });

    it('modifies values over traversed x', function() {
      var decr = function(x){return x - 1};
      assert.deepEqual(
          traverse.mod(data, decr), 
          {circles: [{center: {x: 0, y: 8}, radius: 1},
                     {center: {x: 1, y: 7}, radius: 2},
                     {center: {x: 2, y: 6}, radius: 3}]});
    });
  });

  // describe('Nested traversals', function() {
  //   var users = {
  //     users: [
  //       { friends: [{name: 'Bob'}, {name: 'Alice'}] },
  //       { friends: [{name: 'Bob'}, {name: 'Josh'}, {name: 'Bill'}] }
  //     ]
  //   };
   
  //   var traversal = Tscope.makeTraversal(Tscope.attr('users'), Tscope.attr('friends'));
  //   var deepTraversal = traversal.traversal().then(Tscope.attr('name'));
 
  //   it('modify data', function(done) {
  //     var toUpper = function (s) { return s.toUpperCase() }
  //     assert.deepEqual(deepTraversal.list(users, toUpper), {
  //       users: [
  //         { friends: [{name: 'BOB'}, {name: 'ALICE'}] },
  //         { friends: [{name: 'BOB'}, {name: 'JOSH'}, {name: 'BILL'}] }
  //       ]
  //     });
  //   });
  // });

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

  // describe('Traversed cursors', function() {
  //   var data = [{x: 0, y: 9}, {x: 1, y: 8}, {x: 2, y: 7}];
  //   var traverse = Tscope.traversed(Tscope.attr('x'));
  //   var fullCursor, cursor;

  //   beforeEach(function reset(){
  //     fullCursor = Tscope.dataCursor(data);
  //     cursor = fullCursor.then(traverse);
  //   });

  //   it('get traversed x', function() {
  //     assert.deepEqual(cursor(), [0, 1, 2]);
  //   });

  //   it('set traversed x', function() {
  //     cursor([1, 3, 5]);
  //     assert.deepEqual(fullCursor(), [{x: 1, y: 9}, {x: 3, y: 8}, {x: 5, y: 7}]);
  //   });

  //   it('modifies values over traversed x', function() {
  //     var incr = function(x){return x + 1};
  //     cursor.mod(function (xs) {return xs.map(incr)});
  //     assert.deepEqual(fullCursor(), [{x: 1, y: 9}, {x: 2, y: 8}, {x: 3, y: 7}]);
  //   });
  // });
})
