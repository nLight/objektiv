var assert = require("assert");
var Objektiv = require("../src/objektiv");

describe("Objektiv", function() {
  describe("Object property", function() {
    var data = { someField: 1, someValue: 2 };

    it("knows its id", () => {
      assert.equal(Objektiv.attr("someField").id, "someField");
    });

    describe("when property exists", function() {
      it("returns value of a property", function() {
        assert.equal(1, Objektiv.attr("someField")(data));
      });

      it("sets a value of a property", function() {
        assert.deepEqual(Objektiv.attr("someField")(data, 2), {
          someField: 2,
          someValue: 2
        });
      });

      it("modifies a value of a property", function() {
        var incr = function(x) {
          return x + 1;
        };
        assert.deepEqual(Objektiv.attr("someField").mod(data, incr), {
          someField: 2,
          someValue: 2
        });
      });
    });

    describe("when property not found", function() {
      it("throws a TypeError on get", function() {
        assert.throws(
          function() {
            Objektiv.attr("not_found").get(data);
          },
          TypeError,
          "Property 'not_found' doesn't exist!"
        );
      });

      it("throws a TypeError on set", function() {
        assert.throws(
          function() {
            Objektiv.attr("not_found").set(data, 2);
          },
          TypeError,
          "Property 'not_found' doesn't exist!"
        );
      });

      it("throws a TypeError on mod", function() {
        var incr = function(x) {
          return x + 1;
        };

        assert.throws(
          function() {
            Objektiv.attr("not_found").mod(data, incr);
          },
          TypeError,
          "Property 'not_found' doesn't exist!"
        );
      });
    });
  });

  describe("Array element", function() {
    var data = [1, 2, 3];

    it("knows its id", () => {
      assert.equal(Objektiv.at(1).id, 1);
    });

    describe("when element with index exists in array", function() {
      it("returns value of array", function() {
        assert.equal(1, Objektiv.at(0)(data));
      });

      it("sets a value of a property", function() {
        assert.deepEqual(Objektiv.at(1)(data, 4), [1, 4, 3]);
      });
    });

    describe("when element with index not exists in array", function() {
      it("throws a TypeError on get", function() {
        assert.throws(
          function() {
            Objektiv.at(100).get(data);
          },
          TypeError,
          "Element with index 100 not found in the array!"
        );
      });

      it("throws a TypeError on set", function() {
        assert.throws(
          function() {
            Objektiv.at(100).set(data, 1);
          },
          TypeError,
          "Property 'not_found' doesn't exist!"
        );
      });
    });
  });

  describe("Partial lens", function() {
    describe("for an object property", function() {
      var data = { someField: 1, someValue: 2 };

      describe("when property not found", function() {
        it("returns undefined on get", function() {
          assert.equal(
            Objektiv.partialAttr("someValue")
              .partialAttr("deep")
              .get(data),
            undefined
          );
        });
        it("returns unchanged copy on an Object on set", function() {
          assert.deepEqual(Objektiv.partialAttr("not_found").set(data, 1), {
            someField: 1,
            someValue: 2
          });
        });
      });
    });

    describe("for an array element", function() {
      var data = [1, 2, 3];

      describe("when an index not found", function() {
        it("returns undefined on get", function() {
          assert.equal(Objektiv.partialAt(100).get(data), undefined);
        });
        it("returns unchanged copy of an array on set", function() {
          assert.deepEqual(Objektiv.partialAt(100).set(data, 1), [1, 2, 3]);
        });
      });
    });
  });

  describe("Tryhard resolver", function() {
    var data = { some: 1 };
    var lens = Objektiv.makeAttrLens("not_found", Objektiv.resolve.tryhard);

    describe("when property not found", function() {
      it("returns undefined on get", function() {
        assert.equal(lens.get(data), undefined);
      });
      it("creates attr on set", function() {
        assert.deepEqual(lens.set(data, 1), { some: 1, not_found: 1 });
      });
    });
  });

  describe("Deep tryhard resolver", function() {
    var data = { some: 1 };
    var lens = Objektiv.makeAttrLens("not_found", Objektiv.resolve.tryhard);
    var deep = lens.then(lens);

    describe("when property not found", function() {
      it("returns undefined on get", function() {
        assert.equal(deep.get(data), undefined);
      });
      it("creates a deep structure on set", function() {
        assert.deepEqual(deep.set(data, 1), {
          some: 1,
          not_found: { not_found: 1 }
        });
      });
    });
  });

  describe("Default lens", function() {
    var data = { some: 1 };
    var lens = Objektiv.attr("not_found", 0);

    describe("when property not found", function() {
      it("returns default on get", function() {
        assert.equal(lens.get(data), 0);
      });
      it("creates attr on set", function() {
        assert.deepEqual(lens.set(data, 1), { some: 1, not_found: 1 });
      });
      it("uses default on mod", function() {
        var incr = function(x) {
          return x + 1;
        };
        assert.deepEqual(lens.mod(data, incr), { some: 1, not_found: 1 });
      });
    });
  });

  describe("Deep default lens", function() {
    var data = { some: 1 };
    var lensY = Objektiv.attr("x", { z: 10 }).attr("y", 5);
    var lensZ = Objektiv.attr("x", { z: 10 }).attr("z", 5);

    describe("when property not found", function() {
      it("returns first default on get", function() {
        assert.equal(lensY.get(data), 5);
        assert.equal(lensZ.get(data), 10);
      });
      it("uses first default on mod", function() {
        var incr = function(x) {
          return x + 1;
        };
        assert.deepEqual(lensY.mod(data, incr), {
          some: 1,
          x: { y: 6, z: 10 }
        });
        assert.deepEqual(lensZ.mod(data, incr), { some: 1, x: { z: 11 } });
      });
    });
  });

  describe("Composition", function() {
    var data = { someField: [1, 2, { foo: 10 }] };

    describe("using then()", () => {
      it("Composes two lenses", function() {
        assert.deepEqual(
          Objektiv.attr("someField").then(Objektiv.at(0))(data),
          1
        );
      });

      it("knows its path", function() {
        assert.deepEqual(
          Objektiv.attr("someField").then(Objektiv.at(0)).path,
          "someField.0"
        );
      });

      it("Composes arbitrary number of lenses", function() {
        var composition = Objektiv.attr("someField").then(
          Objektiv.at(2),
          Objektiv.attr("foo")
        );
        assert.deepEqual(composition(data), 10);
      });
    });

    describe("using chaining", () => {
      it("chains constructors", function() {
        assert.deepEqual(Objektiv.attr("someField").at(0)(data), 1);
        assert.deepEqual(
          Objektiv.attr("someField")
            .at(2)
            .attr("foo")(data),
          10
        );
      });

      it("knows its path", function() {
        assert.deepEqual(Objektiv.attr("someField").at(0).path, "someField.0");
      });
    });
  });

  describe("Aliases", function() {
    var data = [1, 2, 3];

    it("has get alias", function() {
      assert.equal(Objektiv.at(0).get(data), Objektiv.at(0)(data));
    });

    it("has set alias", function() {
      assert.deepEqual(Objektiv.at(0).set(data, 5), Objektiv.at(0)(data, 5));
    });
  });

  describe("Cursor", function() {
    var data = {
      deep: { data: 1 },
      elements: [
        { name: "Carbon", atomicNumber: 6 },
        { name: "Nitrogen", atomicNumber: 7 },
        { name: "Oxygen", atomicNumber: 8 }
      ]
    };
    var lens = Objektiv.attr("deep").attr("data");

    it("knows its id", () => {
      assert.equal(
        Objektiv.dataCursor({}).then(Objektiv.attr("deep")).id,
        "deep"
      );
    });

    it("knows its path", () => {
      assert.equal(
        Objektiv.dataCursor({}).then(
          Objektiv.attr("deep")
            .at(0)
            .attr("bottom")
        ).path,
        "deep.0.bottom"
      );
    });

    it("works", function() {
      var deepCursor = Objektiv.dataCursor(data).then(lens);

      assert.equal(1, deepCursor.get());
      deepCursor.set(2);
      assert.equal(2, deepCursor.get());
      deepCursor.mod(function(x) {
        return x + 1;
      });
      assert.equal(3, deepCursor.get());
    });

    it("composes", function() {
      var fullCursor = Objektiv.dataCursor(data);
      var deepCursor = fullCursor.then(lens);
      assert.equal(deepCursor.get(), 1);
      assert.deepEqual(fullCursor.attr("deep").get(), { data: 1 });
    });

    it("receives new state and old state in a callback", function() {
      var full = Objektiv.dataCursor(data, function(newState, oldState) {
        assert.deepEqual(oldState, { deep: { data: 1 } });
        assert.deepEqual(newState, { deep: { data: 2 } });
      });
      var deepCursor = Objektiv.dataCursor(data)
        .attr("deep")
        .attr("data");
      deepCursor.mod(function(x) {
        return x + 1;
      });
    });

    it("maps through cursors", function() {
      var elementsCursor = Objektiv.dataCursor(data).attr("elements");
      var mappedCursors = elementsCursor.map(function(elCursor) {
        return elCursor;
      });

      assert.equal(mappedCursors[0].attr("name").get(), "Carbon");
    });

    it("passes subcursor, index and a full cursor into map function", function() {
      var elementsCursor = Objektiv.dataCursor(data).attr("elements");
      var j = 0;
      elementsCursor.map(function(elCursor, i, full) {
        assert.deepEqual(elCursor.get(), data.elements[i]);
        assert.deepEqual(elementsCursor.get(), full.get());
        assert.equal(i, j);

        j++;
      });
    });
  });

  describe("Traversed cursors", function() {
    var data = [{ x: 0, y: 9 }, { x: 1, y: 8 }, { x: 2, y: 7 }];
    var fullCursor, cursor;

    beforeEach(function reset() {
      fullCursor = Objektiv.dataCursor(data);
      cursor = fullCursor.traversal().attr("x");
    });

    it("get traversed x", function() {
      assert.deepEqual(cursor(), [0, 1, 2]);
    });

    it("set traversed x", function() {
      cursor(42);
      assert.deepEqual(fullCursor(), [
        { x: 42, y: 9 },
        { x: 42, y: 8 },
        { x: 42, y: 7 }
      ]);
    });

    it("modifies values over traversed x", function() {
      cursor.mod(function(x) {
        return x + 1;
      });
      assert.deepEqual(fullCursor(), [
        { x: 1, y: 9 },
        { x: 2, y: 8 },
        { x: 3, y: 7 }
      ]);
    });
  });
});
