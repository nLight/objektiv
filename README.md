Objektiv [![Build Status](https://travis-ci.org/nLight/objektiv.svg?branch=master)](https://travis-ci.org/nLight/objektiv)
==================

Functional lenses in JavaScript

## Basics

`Objektiv.attr('field')` Object attribute accessor.<br>
`Objektiv.at(index)` Array element accessor.<br>
`lens.then(otherLens, ...)` Lens composition can take many arguments.<br>
`lens.traversal([filter])` Returns traversal, optionally filtered.


# Regular lenses

Throw TypeError unless element has been found

```javascript
var data = { array: [1, 2, 3] };
var firstOfSome = Objektiv.attr('array').at(0);

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
var firstOfMissing = Objektiv.partialAttr('missing').partialAt(0);

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
var traversal = Objektiv.attr('array').traversal().attr('x');

traversal.get(data); //=> [0, 1, 2]
traversal.mod(data, incr) //=> {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6) //=> {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]}

// Nested traversals
var data = {users: [{id: 1, friends: ['Alice', 'Bob']}, {id: 2, friends: ['Sam']}]};
var traversal = Objektiv.attr('users').traversal().attr('friends').traversal()

traversal.get(data)
//=> [['Alice', 'Bob'], ['Sam']]
traversal.mod(data, function (s) { return s.toUpperCase() })
//=> {users: [{id: 1, friends: ['ALICE', 'BOB']}, {id: 2, friends: ['SAM']}]};
```

## Filtered traversals

Array elements can be traversed by calling `.traversal([predicate])` on a lens that references an array.<br>
You can pass `predicate` in traversal to filter elements of an array or chain `.traversal().filter(predicate)` function.<br>
Several `.filter()` functions can be chained one after another.

```javascript
var data = {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 2, y: 7}]};
var x_gt_1 = function (el) { return el.x > 1; }
var traversal = Objektiv.attr('array').traversal(x_gt_1).attr('x');
// Same as:
Objektiv.attr('array').traversal().filter(x_gt_1).attr('x');

traversal.get(data); //=> [2]
traversal.mod(data, incr) //=> {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6) //=> {array: [{x: 0, y:9}, {x: 0, y: 8}, {x: 6, y: 7}]}

// Nested traversals
var data = {users: [{id: 1, friends: ['Alice', 'Bob']}, {id: 2, friends: ['Sam']}]};
var friendly = function (user) { return user.friends.length == 2; }
var threeLetter = function (s) { return s.length == 3; }
var traversal = Objektiv.attr('users').traversal(friendly)
                      .attr('friends').traversal(threeLetter);

traversal.get(data)
//=> [['Bob']]
traversal.mod(data, function (s) { return s.toUpperCase() })
//=> {users: [{id: 1, friends: ['Alice', 'BOB']}, {id: 2, friends: ['Sam']}]};
```

# Cursors

Objektiv also provides cursors which are lenses enclosed over data or root accessors. Cursors a handy self-contained object to pass around. Cursors can be composed and traversed as regular lenses.

```javascript
var data = {some: deep: 1};
var full = Objektiv.dataCursor(data);
var deepLens = Objektiv.attr('some').attr('deep');
var cursor = full.then(deepLens);

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

Cursor can notify about each change via callback:

```javascript
var full = Objektiv.dataCursor(data, function (newState, oldState) {
    // ... deal with it
})
```

This way it can be used with react.js. Inside a component:

```javascript
var that = this;
var full = Objektiv.dataCursor(this.state, function (state) {
  that.setState(state);
});
var childCursor = full.attr('child') // ... and pass it to a child component
```

Outside of a root component:

```javascript
var root = <Root ... />;
Objektiv.dataCursor({/** Initial data **/}, function (state) {
  root.setProps(state);
});
React.renderComponent(root, ...);
```
