tscope.js
=========

Functional lenses in JavaScript

`Tscope.attr('field')` Object attribute accessor<br/>
`Tscope.at(index)` Array element accessor<br/>
`lens.then(otherLens)` Lens composition


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
