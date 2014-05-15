tscope.js [![Build Status](https://travis-ci.org/nLight/tscope.js.svg?branch=master)](https://travis-ci.org/nLight/tscope.js)
==================

Functional lenses in JavaScript

## Basics

`Tscope.attr('field')` Object attribute accessor.<br>
`Tscope.at(index)` Array element accessor.<br>
`lens.then(otherLens, ...)` Lens composition can take many arguments.<br>
`lens.traversal([filter])` Returns traversal, optionally filtered.


# Regular lenses

Throw TypeError unless element has been found

```javascript
var data = { array: [1, 2, 3] };
var firstOfSome = Tscope.attr('array').then(Tscope.at(0));

// Getter
firstOfSome(data); //=> 1
firstOfSome.get(data); //=> 1

// Setter
firstOfSome(data, 10); //=> { array: [10, 2, 3] }
firstOfSome.set(data, 10); //=> { array: [10, 2, 3] }

// Modifier
var incr = function(x){ return x + 1 };
firstOfSome.mod(data, incr); //=> { array: [2, 2, 3] }

```


# Partial lenses

Skip missing element

```javascript
var data = { array: [1, 2, 3] };
var firstOfMissing = Tscope.partialAttr('missing').then(Tscope.partialAt(0));

// Getter returns undefined
firstOfMissing(data); //=> undefined
firstOfMissing.get(data); //=> undefined

// Setter returns data unchanged
firstOfMissing(data, 10); //=> { array: [1, 2, 3] }
firstOfMissing.set(data, 10); //=> { array: [1, 2, 3] }

// Modifier returns data unchanged
var incr = function(x){ return x + 1 };
firstOfMissing.mod(data, incr); //=> { array: [1, 2, 3] }

```


# Traversals

Traversals make working with series of data easy:

```javascript
var data = {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 2, y: 7}]};
var traversal = Tscope.attr('array').traversal().then(Tscope.attr('x'));

traversal.get(data); //=> [0, 1, 2]
traversal.mod(data, incr) //=> {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6) //=> {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]}

// Nested traversals
var data = {users: [{id: 1, friends: ['Alice', 'Bob']}, {id: 2, friends: ['Sam']}]};
var traversal = Tscope.attr('users').traversal().then(Tscope.attr('friends')).traversal()

traversal.get(data)
//=> [['Alice', 'Bob'], ['Sam']]
traversal.mod(data, function (s) { return s.toUpperCase() })
//=> {users: [{id: 1, friends: ['ALICE', 'BOB']}, {id: 2, friends: ['SAM']}]};
```

## Filtered traversals

Array elements can be traversed by calling `.traversal([filterFunction])` on a lens that references an array.<br>
You can pass `filterFunction` in traversal to filter elements of an array or chain `.traversal()).filter(filterFunction)` function.<br>
Several `.filter()` functions can be chained one after another.

```javascript
var data = {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 2, y: 7}]};
var filterArray = function (el) { return el.x > 1; }
var traversal = Tscope.attr('array').traversal(filterArray).then(Tscope.attr('x'));
// Same as:
// Tscope.attr('array').traversal().filter(filterArray).then(Tscope.attr('x'));

traversal.get(data); //=> [2]
traversal.mod(data, incr) //=> {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6) //=> {array: [{x: 0, y:9}, {x: 0, y: 8}, {x: 6, y: 7}]}

// Nested traversals
var data = {users: [{id: 1, friends: ['Alice', 'Bob']}, {id: 2, friends: ['Sam']}]};
var friendsFilter = function(user) { return user.friends.length == 2; }
var nameFilter = function(friend) { return friend.length == 3; }
var traversal = Tscope.attr('users').traversal(friendsFilter).then(Tscope.attr('friends')).traversal(nameFilter);

traversal.get(data)
//=> [['Bob']]
traversal.mod(data, function (s) { return s.toUpperCase() })
//=> {users: [{id: 1, friends: ['Alice', 'BOB']}, {id: 2, friends: ['Sam']}]};
```

# Cursors

Tscope also provides cursors which are lenses enclosed over data or root accessors. Cursors a handy self-contained object to pass around. Cursors can be composed and traversed as regular lenses.

```javascript
var data = {some: deep: 1};
var full = Tscope.dataCursor(data);
var deepLens = Tscope.attr('some').then(Tscope.attr('deep');
var cursor = full.then(deepLens);
// Or
var cursor = Tscope.dataCursor(data, deepLens);

// Access
cursor() //=> 1
cursor.get() //=> 1

// Modify
cursor(42)
cursor.set(42)
cursor() //=> 42
full() //=> {some: deep: 42}
// All data are handled as immutable so original data is still:
data   //=> {some: deep: 1}
```

Tscope also provides low-level `Tscope.makeCursor(getter, setter, [lens])`. For example, this way it can be used with react.js:

```javascript
var that = this;
var full = Tscope.makeCursor(
    function () {return that.state},
    function (value) {return that.setState(value)}
);
var deepCursor = full.then(deepLens);
// ... pass it to child component
```
