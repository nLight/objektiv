var assert = require("assert")
var Tscope = require("../src/tscope")

describe('Tscope', function(){
  describe('Object property', function(){
    var data = { someField: 1 };

    Tscope.make('someField');

    it('returns value of a property', function(){
      assert.equal(1, Tscope.o.someField(data));
    });

    it('sets a value of a property', function() {
      assert.deepEqual(Tscope.o.someField(data, 2), { someField: 2 });
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
    var data = { someField: [1, 2, 3] };
    Tscope.make('someField');
    
    it('Composes a lenses', function() {
      assert.deepEqual(1,  Tscope.o.someField.$(Tscope.at(0))(data));
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
})
