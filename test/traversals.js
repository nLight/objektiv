var assert = require("assert")
var Tscope = require("../src/tscope")

var incr = function(x){return x + 1};

describe('Traversal', function() {
  var data = {array: [{x: 0, y: 9}, {x: 1, y: 8}, {x: 2, y: 7}]};

  describe('without filter', function() {
    var traverse = Tscope.attr('array').traversal().attr('x');

    it('gets traversed x', function() {
      assert.deepEqual(traverse.get(data), [0, 1, 2]);
    });
    it('modifies traversed x', function() {
      assert.deepEqual(traverse.mod(data, incr), {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]});
    });
  });

  describe('with filtered base', function() {
    var filtered = Tscope.attr('array').traversal(function(point){return point.x == 1;})
                         .attr('x');

    it('gets traversed x', function() {
      assert.deepEqual(filtered.get(data), [1]);
    });
    it('modifies traversed x', function() {
      assert.deepEqual(filtered.mod(data, incr), {array: [{x: 0, y: 9}, {x: 2, y: 8}, {x: 2, y: 7}]});
    });
  });

  describe('with filtered item', function() {
    var filtered = Tscope.attr('array').traversal().attr('x')
                         .filter(function(x){return x == 1;});

    it('gets traversed x', function() {
      assert.deepEqual(filtered.get(data), [1]);
    });
    it('modifies traversed x', function() {
      assert.deepEqual(filtered.mod(data, incr), {array: [{x: 0, y: 9}, {x: 2, y: 8}, {x: 2, y: 7}]});
    });
  });

  describe('with filtered base and item', function() {
    var filtered = Tscope.attr('array')
                        .traversal(function(point){return point.x >= 1})
                        .attr('y')
                        .filter(function(y){return y >= 8});

    it('gets filtered y', function() {
      assert.deepEqual(filtered.get(data), [8]);
    });
    it('modifies traversed y', function() {
      assert.deepEqual(filtered.mod(data, incr), {array: [{x: 0, y: 9}, {x: 1, y: 9}, {x: 2, y: 7}]});
    });
  });

  describe('with 2 same level filters', function() {
    var filtered = Tscope.attr('array')
                        .traversal()
                        .filter(function(point){return point.x >= 1})
                        .filter(function(point){return point.y >= 8})
                        .attr('y')

    it('gets filtered y', function() {
      assert.deepEqual(filtered.get(data), [8]);
    });
    it('modifies traversed y', function() {
      assert.deepEqual(filtered.mod(data, incr), {array: [{x: 0, y: 9}, {x: 1, y: 9}, {x: 2, y: 7}]});
    });
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
  var toUpper = function (s) { return s.toUpperCase() }

  describe('with no filter', function() {
    var nestedTraversal = traversal.traversal().attr('name');

    it('get data', function() {
      assert.deepEqual(nestedTraversal.get(users), [["Bob","Alice"],["Bob","Josh","Bill"]]);
    });

    it('modify data', function() {
      assert.deepEqual(nestedTraversal.mod(users, toUpper), {
        users: [
          { friends: [{name: 'BOB', email: 'bob@gmail.com'}, {name: 'ALICE', email: 'kitty@example.com'}] },
          { friends: [{name: 'BOB', email: 'bobby@example.com'}, {name: 'JOSH', email: 'josh@gmail.com'}, {name: 'BILL', email: 'bill@gmail.com'}]}
        ]
      });
    });
  });

  describe('with filter', function() {
    var nestedTraversalFiltered = traversal.traversal(function(friend){
          return friend.email.indexOf('gmail.com') != -1
        }).attr('name');

    it('get data', function() {
      assert.deepEqual(nestedTraversalFiltered.get(users), [["Bob"],["Josh","Bill"]]);
    });

    it('modify data', function() {
      assert.deepEqual(nestedTraversalFiltered.mod(users, toUpper), {
        users: [
          { friends: [{name: 'BOB', email: 'bob@gmail.com'}, {name: 'Alice', email: 'kitty@example.com'}] },
          { friends: [{name: 'Bob', email: 'bobby@example.com'}, {name: 'JOSH', email: 'josh@gmail.com'}, {name: 'BILL', email: 'bill@gmail.com'}]}
        ]
      });
    });
  });
});
