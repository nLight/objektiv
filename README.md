tscope.js
=========

Functional lenses in JavaScript

[![Build Status](https://travis-ci.org/nLight/tscope.js.svg?branch=master)](https://travis-ci.org/nLight/tscope.js)

`Tscope.attr('field', ...)` Object attribute accessor. In case of many arguments lenses will be composed   
`Tscope.at(index)` Array element accessor   
`lens.then(otherLens)` Lens composition   
`lens.then(otherLens, oneMoreLens, ...)` `then()` can take many arguments   
`Tscope.traversed(lens)` Returns traversed lens


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

// Traversal
var data = {array: [{x: 0, y:9}, {x: 1, y: 8}, {x: 2, y: 7}]};
var traverse = Tscope.attr('array').then(Tscope.traversed(Tscope.attr('x')));

traverse(data); //=> [0, 1, 2]
traverse(data, 6) //=> {array: [{x: 6, y:9}, {x: 6, y: 8}, {x: 6, y: 7}]}
```
