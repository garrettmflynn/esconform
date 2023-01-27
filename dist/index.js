(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/globals.ts
  var valueSymbol = Symbol("value");
  var removeSymbol = Symbol("remove");

  // src/presets.ts
  var presets_exports = {};
  __export(presets_exports, {
    objectify: () => objectify
  });
  var objectify = (key, value2) => {
    if (value2 == void 0) {
      const og = value2;
      value2 = /* @__PURE__ */ Object.create(null);
      Object.defineProperty(value2, valueSymbol, { value: og });
    }
    return value2;
  };

  // src/properties.ts
  var rawProperties = {};
  var globalObjects = [
    "Object",
    "Array",
    "Map",
    "Set",
    "Number",
    "Boolean",
    "String",
    "Date",
    "RegExp",
    "Function",
    "Promise",
    "Symbol",
    "BigInt",
    "Error",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint16Array",
    "Uint32Array",
    "Uint8ClampedArray",
    "ArrayBuffer",
    "SharedArrayBuffer"
  ];
  function getAllPropertyNames(obj) {
    var props = [];
    if (obj) {
      do {
        const name = obj.constructor?.name;
        const isGlobalObject = globalObjects.includes(name);
        if (globalObjects.includes(name)) {
          if (!rawProperties[name])
            rawProperties[name] = [...Object.getOwnPropertyNames(globalThis[name].prototype)];
        }
        Object.getOwnPropertyNames(obj).forEach(function(prop) {
          if (isGlobalObject && rawProperties[name].includes(prop))
            return;
          if (props.indexOf(prop) === -1)
            props.push(prop);
        });
      } while (obj = Object.getPrototypeOf(obj));
    }
    return props;
  }

  // src/transformations.ts
  var isPromise = (o) => o && typeof o === "object" && typeof o.then === "function";
  var unresolved = Symbol("unresolved");
  var registerAllProperties = (o, specObject, funcs = {}, path = [], history = [], acc = {}) => {
    if (history.length === 0)
      history.push(o);
    const properties = /* @__PURE__ */ new Set([...getAllPropertyNames(o), ...Object.getOwnPropertySymbols(o)]);
    const specKeys = /* @__PURE__ */ new Set([...getAllPropertyNames(specObject), ...Object.getOwnPropertySymbols(specObject)]);
    const registeredProperties = new Set(specKeys);
    const register = (key) => {
      const registered = registerPropertyUpdate(key, path, history, acc, funcs, specObject);
      registered.forEach((key2) => {
        specKeys.delete(key2);
        registeredProperties.add(key2);
      });
    };
    properties.forEach(register);
    specKeys.forEach(register);
    let toReturn = acc;
    if (globalThis.Proxy) {
      toReturn = new Proxy(acc, {
        set(target, property, value2) {
          if (registeredProperties.has(property))
            target[property] = value2;
        }
      });
    } else
      console.warn("[esmodel] Proxy not available. Unregistered property setters will not be intercepted.");
    return toReturn;
  };
  var registerPropertyUpdate = (key, path, history, acc, funcs, specObject = {}, linked = false) => {
    const parent = history[history.length - 1];
    const updatedPath = [...path, key];
    let resolved = unresolved;
    let registered = [];
    const update = funcs.keys ? funcs.keys(key, specObject, path, history) : key;
    const isObject = update && typeof update === "object";
    const links = isObject ? update.links : void 0;
    if (links) {
      for (let o of links) {
        const parentCopy = history[history.length - 1] = { ...parent };
        registered.push(o.key);
        if (typeof o.update === "function") {
          let getter2 = function() {
            const res = "value" in o ? o.value : resolved !== unresolved ? resolved : parent[key];
            value2 = isPromise(res) ? res.then(setter2) : setter2(res);
            return onUpdate(value2);
          }, setter2 = function(value3) {
            value3 = onValueUpdate(value3, acc, [...path, o.key], history, funcs, specObject[o.key]);
            return value3;
          };
          let value2 = unresolved;
          const onUpdate = o.update;
          Object.defineProperty(parentCopy, o.key, {
            get: getter2,
            set: (v) => {
              value2 = v;
              return value2;
            }
          });
        } else
          parentCopy[o.key] = o.value;
        registerPropertyUpdate(o.key, path, history, acc, funcs, specObject, true);
      }
    }
    const enumerable = isObject ? update.enumerable === false ? false : true : true;
    const _update = isObject ? update.value : update;
    const type = typeof _update;
    const silence = _update == void 0 || _update === removeSymbol || type !== "string" && type !== "symbol";
    const resolvedKey = silence ? key : _update;
    if (silence && !links)
      return registered;
    else
      registered.push(resolvedKey);
    const desc = { ...Object.getOwnPropertyDescriptor(parent, key) };
    delete desc.value;
    delete desc.writable;
    function setter(value2) {
      resolved = onValueUpdate(value2, acc, updatedPath, history, funcs, specObject[resolvedKey]);
      return resolved;
    }
    function getter() {
      if (silence)
        return;
      else if (resolved === unresolved || linked) {
        const value2 = parent[key];
        return isPromise(value2) ? value2.then(setter) : setter(value2);
      } else
        return resolved;
    }
    Object.defineProperty(acc, resolvedKey, {
      ...desc,
      get: getter,
      set: desc.set ? (value2) => {
        desc.set(value2);
        return setter(value2);
      } : setter,
      enumerable: silence ? false : enumerable,
      configurable: false
    });
    if (key !== resolvedKey)
      delete acc[key];
    return registered;
  };
  var onValueUpdate = (value2, parent, path, history, funcs, specValue) => {
    const key = path[path.length - 1];
    const update = funcs.values ? funcs.values(key, value2, specValue, path, history) : value2;
    const updateIsObject = update && typeof update === "object";
    const resolved = updateIsObject && "value" in update ? update.value : update;
    const isObject = resolved && resolved?.constructor?.name === "Object";
    const clone = typeof resolved === "symbol" ? resolved : isObject ? { ...resolved } : Array.isArray(resolved) ? [...resolved] : resolved?.constructor ? new resolved.constructor(resolved) : resolved;
    if (isObject)
      registerAllProperties(clone, specValue, funcs, path, [...history, value2], clone);
    return clone;
  };
  var keys = (object2, specObject, keyUpdateFunction) => registerAllProperties(object2, specObject, { keys: keyUpdateFunction });
  var apply = (object2, specObject, updateFunctions) => registerAllProperties(object2, specObject, updateFunctions);
  var values = (object2, specObject, valueUpdateFunction) => registerAllProperties(object2, specObject, { values: valueUpdateFunction });

  // src/model.ts
  var Model = class {
    constructor(config) {
      this.config = {};
      this.set = (config) => this.config = config;
      this.apply = (o, spec = this.config.specification) => apply(o, spec, this.config);
      this.keys = (o, spec = this.config.specification) => keys(o, spec, this.config.keys);
      this.values = (o, spec = this.config.specification) => values(o, spec, this.config.values);
      this.set(config);
    }
  };

  // demos/basic.ts
  var symbol = Symbol("symbol");
  var object = {
    number: 1,
    string: "hi there",
    boolean: true,
    array: [1, 2, 3],
    float32: new Float32Array([1, 2, 3]),
    object: {
      number: "hi there"
    },
    [symbol]: "this is a symbol",
    function: () => {
      console.log("hi there");
    },
    undefined: void 0,
    null: null
  };
  var specification = {
    Number: true,
    String: true,
    Boolean: true,
    Object: {
      Boolean: true
    }
  };
  var value;
  Object.defineProperty(object, "hidden", { get: () => value, set: (v) => value = v, enumerable: false });
  Object.defineProperty(object, "promise", { get: function() {
    return new Promise((resolve) => setTimeout(() => resolve(value), 1e3));
  }, set: (v) => value = v, enumerable: false });
  var model = new Model({
    values: presets_exports.objectify,
    keys: (key, spec) => {
      if (typeof key === "string")
        key = key[0].toUpperCase() + key.slice(1);
      return {
        value: key,
        enumerable: spec[key] ? true : false
      };
    },
    specification
  });
  var output = model.apply(object);
  console.log("Got!", output);
  console.log("Original!", object);
  console.log("--------- Enumerating  ---------");
  var keys2 = Object.keys(output);
  console.log("Got keys", keys2);
  for (let key in output)
    console.log("Enumerable", key, output[key]);
  console.log("--------- Setting hidden value on original ---------");
  console.log("Hidden value (output, before)", output.Hidden);
  object.hidden = 5;
  console.log("Hidden value (output)", output.Hidden);
  console.log("Hidden value (original)", object.hidden);
  console.log("--------- Setting hidden value on output ---------");
  output.Hidden = 10;
  console.log("Hidden value (output)", output.Hidden);
  console.log("Hidden value (original)", object.hidden);
  console.log("--------- Getting symbol value ---------");
  console.log("Symbol value (output)", output[symbol]);
  console.log("Symbol value (original)", object[symbol]);
  console.log("--------- Updating number value ---------");
  console.log("Number value (before)", output.Number);
  output.Number = 10;
  console.log("Number value (after)", output.Number);
  console.log("--------- Updating object value ---------");
  console.log("Object value (before)", output.Object);
  output.Object = {
    number: 1,
    string: "hi there",
    boolean: true
  };
  console.log("Object value (after)", output.Object);
  console.log("--------- Adding nested property to Typed Array ---------");
  console.log("Typed array property value (before)", output.Float32.test);
  output.Float32.test = true;
  console.log("Typed array property value (after)", output.Float32.test);
  console.log("Typed array property value (original)", object.float32.test);
  var checkPromise = async () => {
    console.log("--------- Checking promise value ---------");
    console.log("Promise value (before)", await output.Promise);
    output.Promise = 20;
    console.log("Promise value (after)", await output.Promise);
  };
  checkPromise();

  // demos/advanced.ts
  console.log("---------------- ADVANCED DEMO ----------------");
  var model2 = new Model({
    values: (key, value2, spec) => {
      if (value2 && spec === "isodatetime")
        return new Date(value2).toISOString();
      else
        return value2;
    },
    keys: (key, spec) => {
      const specVal = spec[key];
      let info = {
        value: key,
        enumerable: specVal?.enumerable ?? true
      };
      if (key === "fullName") {
        info.links = [
          { key: "firstName", update: (value2) => value2.split(" ")[0] },
          { key: "lastName", update: (value2) => value2.split(" ")[1] }
        ];
      }
      if (!(key in spec))
        delete info.value;
      return info;
    },
    specification: {
      firstName: "string",
      lastName: "string",
      age: "number",
      address: {
        type: "string",
        enumerable: false
      },
      dateOfBirth: "isodatetime"
    }
  });
  var person = {
    fullName: "John Doe",
    age: 30,
    address: "123 Main St",
    extra: "THIS IS REALLY ANNOYING"
  };
  var john = model2.apply(person);
  console.log("John", john);
  console.log("Data", person);
  console.log("firstName", john.firstName);
  console.log("lastName", john.lastName);
  console.log("fullName", john.fullName);
  console.log("extra", john.extra, "extra" in john);
  john.extra = "TEST";
  console.log("extra", john.extra, "extra" in john);
  john.fullName = "Jane Doe";
  console.log("firstName", john.firstName);
  console.log("lastName", john.lastName);
  console.log("fullName", john.fullName);
  var dob = new Date("1990-01-01");
  console.log("DoB", dob);
  john.dateOfBirth = dob;
  console.log("DoB", john.dateOfBirth);
})();
