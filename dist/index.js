(() => {
  var __defProp = Object.defineProperty;
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
  };

  // src/globals.ts
  var valueSymbol = Symbol("value");
  var removeSymbol = Symbol("remove");
  var newKeySymbol = Symbol("newKey");
  var attachedSpecSymbol = Symbol("hasAttachedSpec");
  var fromSpecSymbol = Symbol("fromSpec");
  var propertiesRegistrySymbol = Symbol("propertiesRegistry");

  // src/presets.ts
  var presets_exports = {};
  __export(presets_exports, {
    objectify: () => objectify
  });

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

  // src/transfer.ts
  var transfer = (o, toTransfer, descOverride) => {
    const properties = /* @__PURE__ */ new Set([...getAllPropertyNames(toTransfer), ...Object.getOwnPropertySymbols(toTransfer)]);
    properties.forEach((key) => {
      if (!(key in o) && key !== valueSymbol) {
        const desc = Object.getOwnPropertyDescriptor(toTransfer, key);
        Object.defineProperty(o, key, descOverride ? { ...desc, ...descOverride } : desc);
      }
    });
    return o;
  };

  // src/presets.ts
  var objectify = (key, value) => {
    const constructor = value?.constructor;
    if (Array.isArray(value)) {
      const og = value;
      value = [];
      value = transfer(value, og);
    } else if (constructor) {
      let og = value;
      if (Array.isArray(value))
        value = [...value];
      else
        value = new constructor(value);
      value = transfer(value, og);
    } else {
      if (!value) {
        const og = value;
        value = /* @__PURE__ */ Object.create(null);
        Object.defineProperty(value, valueSymbol, { value: og });
      }
    }
    return value;
  };

  // src/transformations.ts
  var isPromise = (o) => o && typeof o === "object" && typeof o.then === "function";
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  var unresolved = Symbol("unresolved");
  function hasSpecValue(key, specObject, fallbackKey) {
    return key in specObject || fallbackKey in specObject;
  }
  function getSpecKey(key, specObject, fallbackKey) {
    return key in specObject ? key : fallbackKey in specObject ? fallbackKey : void 0;
  }
  function getSpecValue(key, specObject, fallbackKey) {
    return key in specObject ? specObject[key] ?? specObject[fallbackKey] : specObject[fallbackKey];
  }
  var registerAllProperties = (o, specObject, funcs = {}, options = {}, path = [], history = [], toIterate = {}) => {
    const first = history.length === 0;
    if (first)
      history.push(o);
    const willUpdateOriginal = options.target === o;
    const acc = willUpdateOriginal ? history[history.length - 1] : first ? options.target ?? {} : o;
    if (newKeySymbol in acc)
      return o;
    else {
      const properties = /* @__PURE__ */ new Set([...getAllPropertyNames(o), ...Object.getOwnPropertySymbols(o)]);
      properties.delete("constructor");
      const specKeys = /* @__PURE__ */ new Set([...getAllPropertyNames(specObject), ...specObject ? Object.getOwnPropertySymbols(specObject) : []]);
      const registeredProperties = new Set(specKeys);
      const internalMetadata = { willUpdateOriginal };
      const register = (key, historyArr = history) => {
        if (key === valueSymbol)
          return;
        if (typeof key === "string" && isNumeric(key))
          return;
        const registered = registerPropertyUpdate(key, path, historyArr, acc, funcs, specObject, options, internalMetadata);
        registered.forEach((key2) => {
          specKeys.delete(key2);
          registeredProperties.add(key2);
        });
      };
      let toReturn = acc;
      if (toIterate.properties !== false)
        properties.forEach((k) => register(k));
      if (toIterate.specification !== false)
        specKeys.forEach((k) => register(k));
      if (!(newKeySymbol in acc))
        Object.defineProperty(acc, newKeySymbol, {
          value: (key, value, desc) => {
            const historyCopy = [...history];
            const parentCopy = historyCopy[historyCopy.length - 1] = willUpdateOriginal ? o : { ...o };
            parentCopy[key] = value;
            if (desc) {
              let propertyDesc = { ...desc };
              if (!desc.get && !desc.set)
                propertyDesc.value = value;
              Object.defineProperty(specObject, key, propertyDesc);
            } else
              specObject[key] = void 0;
            register(key, historyCopy);
          },
          writable: false,
          configurable: false
        });
      if (globalThis.Proxy) {
        toReturn = new Proxy(acc, {
          set(target2, property, value) {
            if (registeredProperties.has(property)) {
              target2[property] = value;
              return true;
            }
            return false;
          }
        });
      } else
        console.warn("[esmodel] Proxy not available. Unregistered property setters will not be intercepted.");
      return toReturn;
    }
  };
  var registerPropertyUpdate = (key, path, history, acc, funcs, specObject = {}, options = {}, internalMetadata) => {
    const mutate = internalMetadata.willUpdateOriginal;
    const parent = history[history.length - 1];
    const updatedPath = [...path, key];
    let resolved = unresolved;
    let registered = [];
    const desc = parent ? { ...Object.getOwnPropertyDescriptor(parent, key) } : {};
    const update = funcs.keys ? funcs.keys(key, specObject, path, history) : key;
    const isObject = update && typeof update === "object";
    const links = isObject ? update.links : void 0;
    if (links) {
      for (let o of links) {
        const parentCopy = history[history.length - 1] = mutate ? parent : { ...parent };
        registered.push(o.key);
        if (typeof o.update === "function") {
          let getter = function() {
            const res = "value" in o ? o.value : resolved !== unresolved ? resolved : mutate ? desc.get ? desc.get.call(parent) : desc.value : parent[key];
            value = isPromise(res) ? res.then(setter) : setter(res);
            return onUpdate(value);
          }, setter = function(value2) {
            value2 = onValueUpdate(o.key, value2, [...path, o.key], history, funcs, specObject, options, internalMetadata);
            return value2;
          };
          let value = unresolved;
          const onUpdate = o.update;
          Object.defineProperty(parentCopy, o.key, {
            get: getter,
            set: (v) => {
              value = v;
              return value;
            }
          });
        } else
          parentCopy[o.key] = o.value;
        registerPropertyUpdate(o.key, path, history, acc, funcs, specObject, options, { ...internalMetadata, linked: true });
      }
    }
    const _update = isObject ? update.value : update;
    const specKey = getSpecKey(_update, specObject, key);
    const specDesc = specKey ? { ...Object.getOwnPropertyDescriptor(specObject, specKey) } : {};
    const enumerable = isObject && "enumerable" in update ? update.enumerable : specDesc.enumerable ?? false;
    const type = typeof _update;
    const silence = isObject && "silence" in update ? update.silence : !hasSpecValue(_update, specObject, key) || (_update == void 0 || _update === removeSymbol || type !== "string" && type !== "symbol" && (type === "object" && (!(_update instanceof String) && !(_update instanceof Number))));
    const resolvedKey = silence ? key : _update;
    if (silence && !links) {
      delete acc[key];
      return registered;
    } else
      registered.push(resolvedKey);
    const existingDesc = Object.getOwnPropertyDescriptor(acc, resolvedKey);
    const exists = existingDesc && existingDesc.set && existingDesc.configurable !== true;
    if (exists)
      acc[resolvedKey] = parent[key];
    else {
      let setter = function(value) {
        if (value && typeof value === "object") {
          if (valueSymbol in value)
            value = value[valueSymbol];
          if (value && typeof value.valueOf === "function")
            value = value.valueOf();
        }
        resolved = onValueUpdate(resolvedKey, value, updatedPath, history, funcs, specObject, options, internalMetadata);
        const toReturn = valueSymbol in resolved ? resolved[valueSymbol] : resolved;
        return toReturn;
      }, getter = function() {
        let toReturn;
        if (silence)
          return;
        else if (resolved === unresolved || internalMetadata.linked) {
          const value = mutate ? desc.get ? desc.get.call(parent) : desc.value : (parent ? parent[key] : void 0) ?? getSpecValue(resolvedKey, specObject, key);
          toReturn = isPromise(value) ? value.then(setter) : setter(value);
        } else
          toReturn = valueSymbol in resolved ? resolved[valueSymbol] : resolved;
        return toReturn;
      };
      if (!mutate || desc?.configurable !== false) {
        Object.defineProperty(acc, resolvedKey, {
          get: getter,
          set: desc.set ? (value) => {
            desc.set(value);
            return setter(value);
          } : setter,
          enumerable: silence ? false : enumerable,
          configurable: false
        });
      }
    }
    if (key !== resolvedKey)
      delete acc[key];
    return registered;
  };
  var onValueUpdate = (resolvedKey, value, path, history, funcs, specObject, options, internalMetadata) => {
    const key = path[path.length - 1];
    if (value?.[attachedSpecSymbol])
      specObject[resolvedKey] = value[attachedSpecSymbol];
    const specValue = getSpecValue(resolvedKey, specObject, key);
    const update = funcs.values ? funcs.values(key, value, specValue, path, history) : value;
    const updateIsObject = update && typeof update === "object";
    const resolved = updateIsObject && "value" in update ? update.value : update;
    const isObject = resolved && resolved?.constructor?.name === "Object";
    const clone = typeof resolved === "symbol" ? resolved : isObject ? { ...resolved } : Array.isArray(resolved) ? [...resolved] : objectify(resolvedKey, resolved);
    const historyObject = value ?? resolved;
    const specIsObject = specValue && typeof specValue === "object";
    if (isObject || specIsObject)
      registerAllProperties(clone, specValue, funcs, options, path, [...history, historyObject], { properties: isObject });
    return clone;
  };
  var keys = (object2, specObject, keyUpdateFunction, options) => registerAllProperties(object2, specObject, { keys: keyUpdateFunction }, options);
  var apply = (object2, specObject, updateFunctions, options) => registerAllProperties(object2, specObject, updateFunctions, options);
  var values = (object2, specObject, valueUpdateFunction, options) => registerAllProperties(object2, specObject, { values: valueUpdateFunction }, options);

  // src/Model.ts
  var Model = class {
    constructor(config) {
      this.config = {};
      this.set = (config) => {
        this.config = config;
        const spec = this.config.specification;
        if (Array.isArray(spec)) {
          let acc = this.config.specification = {};
          spec.forEach((o) => transfer(acc, o));
        }
        this.specification = this.config.specification;
      };
      this.apply = (o, options) => apply(o, this.config.specification, this.config, options);
      this.keys = (o, options) => keys(o, this.config.specification, this.config.keys, options);
      this.values = (o, options) => values(o, this.config.specification, this.config.values, options);
      this.set(config);
    }
  };

  // demos/basic.ts
  var symbol = Symbol("symbol");
  var object = {
    number: 1,
    string: "hi there",
    boolean: true,
    object: {
      number: "hi there"
    },
    array: [1, 2, 3],
    float32: new Float32Array([1, 2, 3]),
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
    },
    Undefined: {
      type: "any"
    }
  };
  var nonEnumerableProps = [symbol, "Array", "Float32", "Function", "Null"];
  nonEnumerableProps.forEach((key) => {
    Object.defineProperty(specification, key, { value: true });
  });
  var nonEnumerableObjectProps = ["Number", "String"];
  nonEnumerableObjectProps.forEach((key) => {
    Object.defineProperty(specification.Object, key, { value: true });
  });
  var define = (name, get) => {
    let value;
    Object.defineProperty(object, name, { get: () => get(value), set: (v) => value = v, enumerable: false, configurable: true });
  };
  define("hidden", (value) => value);
  define("promise", (value) => {
    return new Promise((resolve) => setTimeout(() => resolve(value), 1e3));
  });
  var model = new Model({
    values: (key, value, spec) => presets_exports.objectify(key, value),
    keys: (key) => {
      if (typeof key === "string")
        key = key[0].toUpperCase() + key.slice(1);
      return key;
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
    number: Math.pow(2, 32),
    string: "this is a string",
    boolean: "Not a boolean..."
  };
  console.log("Object value (after)", output.Object);
  console.log("--------- Adding nested property to Typed Array ---------");
  console.log("Typed array property value (before)", output.Float32.test);
  output.Float32.test = true;
  console.log("Typed array property value (after)", output.Float32.test);
  console.log("Typed array property value (original)", object.float32?.test);
  var checkPromise = async () => {
    console.log("--------- Checking promise value ---------");
    console.log("Promise value (before)", output.Promise);
    output.Promise = 20;
    console.log("Promise value (after)", output.Promise);
  };
  window.onmousedown = () => checkPromise();
  console.log("--------- Setting undefined ---------");
  console.log("Undefined value (before)", output.Undefined);
  output.Undefined = "should have metadata";
  console.log("Undefined value (after)", output.Undefined);
  console.log("--------- Adding new key through special symbol ---------");
  output[newKeySymbol]("test", "AHHH", { enumerable: false, configurable: true });
  console.log("test", output.Test);
  output[newKeySymbol]("test", "OOF", { enumerable: false });
  console.log("test", output.Test);
  output.Test = "EEK";
  console.log("test", output.Test);

  // demos/advanced.ts
  console.log("---------------- ADVANCED DEMO ----------------");
  var specification2 = {
    firstName: "string",
    lastName: "string",
    age: "number",
    address: {
      type: "string"
    },
    dateOfBirth: "isodatetime"
  };
  Object.defineProperty(specification2, "address", { value: specification2.address });
  var model2 = new Model({
    values: (key, value, spec) => {
      if (value && spec === "isodatetime")
        return new Date(value).toISOString();
      else
        return value;
    },
    keys: (key, spec) => {
      let info = { value: key };
      if (key === "fullName") {
        info.links = [
          { key: "firstName", update: (value) => value.split(" ")[0] },
          { key: "lastName", update: (value) => value.split(" ")[1] }
        ];
      }
      return info;
    },
    specification: specification2
  });
  var person = {
    fullName: "John Doe",
    age: 30,
    address: "123 Main St",
    extra: "THIS IS REALLY ANNOYING"
  };
  var target = {};
  var john = model2.apply(person, {
    target
  });
  console.log("John", john);
  console.log("Data", person);
  console.log("Target", target);
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
