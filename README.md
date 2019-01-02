# Objektiv [![Build Status](https://travis-ci.org/nLight/objektiv.svg?branch=master)](https://travis-ci.org/nLight/objektiv)

Functional lenses in JavaScript

Objektiv (German) Lens, optics, objective

## Basics

`Objektiv.attr('field')` Object attribute accessor.<br>
`Objektiv.at(index)` Array element accessor.<br>
`lens.then(otherLens, ...)` Lens composition can take many arguments.<br>
`lens.traversal([filter])` Returns traversal, optionally filtered.

# Regular lenses

Throw TypeError unless element has been found

```javascript
const data = { array: [1, 2, 3] };
const firstOfSome = Objektiv.attr("array").at(0);

firstOfSome.get(data); //=> 1
firstOfSome.set(data, 10); //=> { array: [10, 2, 3] }
firstOfSome.map(data, x => x + 1); //=> { array: [2, 2, 3] }
```

# Partial lenses

Skip missing element

```javascript
const data = { array: [1, 2, 3] };
const firstOfMissing = Objektiv.partialAttr("missing").partialAt(0);

firstOfMissing.get(data); //=> undefined
firstOfMissing.set(data, 10); //=> { array: [1, 2, 3] }
firstOfMissing.map(data, x => x + 1); //=> { array: [1, 2, 3] }
```

# Traversals

Traversals make working with series of data easy:

```javascript
const data = { array: [{ x: 0, y: 9 }, { x: 1, y: 8 }, { x: 2, y: 7 }] };
const traversal = Objektiv.attr("array")
  .traversal()
  .attr("x");

traversal.get(data); //=> [0, 1, 2]
traversal.map(data, x => x + 1); //=> {array: [{x: 1, y:9}, {x: 2, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6); //=> {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]}

// Nested traversals
const data = {
  users: [{ id: 1, friends: ["Alice", "Bob"] }, { id: 2, friends: ["Sam"] }]
};
const traversal = Objektiv.attr("users")
  .traversal()
  .attr("friends")
  .traversal();

traversal.get(data); //=> [['Alice', 'Bob'], ['Sam']]
traversal.map(data, name => name.toUpperCase()); //=> {users: [{id: 1, friends: ['ALICE', 'BOB']}, {id: 2, friends: ['SAM']}]};
```

## Filtered traversals

Array elements can be traversed by calling `.traversal([predicate])` on a lens that references an array.<br>
You can pass `predicate` in traversal to filter elements of an array or chain `.traversal().filter(predicate)` function.<br>
Several `.filter()` functions can be chained one after another.

```javascript
const data = { array: [{ x: 0, y: 9 }, { x: 1, y: 8 }, { x: 2, y: 7 }] };
const xGreaterThanOne = el => el.x > 1;
const traversal = Objektiv.attr("array")
  .traversal(xGreaterThanOne)
  .attr("x");
// Same as:
Objektiv.attr("array")
  .traversal()
  .filter(xGreaterThanOne)
  .attr("x");

traversal.get(data); //=> [2]
traversal.map(data, x => x + 1); //=> {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 3, y: 7}]}
traversal.set(data, 6); //=> {array: [{x: 0, y:9}, {x: 0, y: 8}, {x: 6, y: 7}]}

// Nested traversals
const data = {
  users: [{ id: 1, friends: ["Alice", "Bob"] }, { id: 2, friends: ["Sam"] }]
};
const hasTwoFriends = user => user.friends.length == 2;
const threeLetter = str => str.length === 3;

const traversal = Objektiv.attr("users")
  .traversal(hasTwoFriends)
  .attr("friends")
  .traversal(threeLetter);

traversal.get(data); //=> [['Bob']]
traversal.map(data, name => name.toUpperCase()); //=> {users: [{id: 1, friends: ['Alice', 'BOB']}, {id: 2, friends: ['Sam']}]};
```

# Cursors

Objektiv also provides cursors which are lenses enclosed over data or root accessors. Cursor is a handy self-contained object to pass around. Cursors can be composed and traversed as regular lenses.

```javascript
const data = {some: deep: 1};
const full = Objektiv.dataCursor(data);
const deepLens = Objektiv.attr('some').attr('deep');
const cursor = full.then(deepLens);

cursor.get() //=> 1
cursor.set(42)
cursor.get() //=> 42
full.get() //=> {some: deep: 42}
// All data are handled as immutable so original data is still:
data   //=> {some: deep: 1}
```

Cursor can notify about each change via callback:

```javascript
const full = Objektiv.dataCursor(data, (newState, oldState) => {
  // ... deal with it
});
```

This way it can be used with ReactJS. Inside a component:

```javascript
const that = this;
const full = Objektiv.dataCursor(this.state, function(state) {
  that.setState(state);
});
const childCursor = full.attr("child"); // ... and pass it to a child component
```

Outside of a root component:

```javascript
const root = <Root ... />;
Objektiv.dataCursor({/** Initial data **/}, function (state) {
  root.setProps(state);
});
React.renderComponent(root, ...);
```
