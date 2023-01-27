import { Model, presets, transfer } from "../src"

const symbol = Symbol('symbol')
const object = {
    number: 1,
    string: 'hi there',
    boolean: true,

    // Objects
    array: [1, 2, 3],
    float32: new Float32Array([1,2,3]),
    object: {
        number: 'hi there' // Incorrect
    },

    // Symbols
    [symbol]: 'this is a symbol',

    // Functions
    function: () => {
        console.log('hi there')
    },

    // Undefined values
    undefined: undefined,
    null: null,

} as any

const specification = {
    Number: true,
    String: true,
    Boolean: true,
    
    // Commenting this breaks
    Object: {
        Boolean: true
    },

    Undefined: {
        type: 'any'
    }
} as any


const define = (name, get) => {
    let value;
    Object.defineProperty(object, name, { get: () => get(value), set: (v) => value = v, enumerable: false, configurable: true })
}

define('hidden', (value) => value)
define('promise', (value) => {
    return new Promise((resolve) => setTimeout(() => resolve(value), 1000))
})

const model = new Model({

    // Transform values to objects
    values: (key, value, spec) => {
        const o = presets.objectify(key, value)

        // Testing the addition of metadata to a null object
        if (spec?.type) return transfer(o, spec, {enumerable: false})
        // else 
        return o
    },

    // Transform keys to uppercase
    keys: (key, spec) => {
        if (typeof key === 'string') key = key[0].toUpperCase() + key.slice(1)
        return {
            value: key,
            enumerable: spec[key] ? true : false
        }
    },

    specification
})

const output = model.apply(
    object, 
    // { clone: false }
)

console.log('Got!', output)
console.log('Original!', object)

// Checking for model correspondence
console.log('--------- Enumerating  ---------')
const keys = Object.keys(output)
console.log('Got keys', keys)
for (let key in output) console.log('Enumerable', key, output[key])

console.log('--------- Setting hidden value on original ---------')
console.log('Hidden value (output, before)', output.Hidden)
object.hidden = 5
console.log('Hidden value (output)', output.Hidden)
console.log('Hidden value (original)', object.hidden)

console.log('--------- Setting hidden value on output ---------')
output.Hidden = 10
console.log('Hidden value (output)', output.Hidden)
console.log('Hidden value (original)', object.hidden)


console.log('--------- Getting symbol value ---------')
console.log('Symbol value (output)', output[symbol])
console.log('Symbol value (original)', object[symbol])

console.log('--------- Updating number value ---------')
console.log('Number value (before)', output.Number)
output.Number = 10
console.log('Number value (after)', output.Number)


console.log('--------- Updating object value ---------')
console.log('Object value (before)', output.Object)
output.Object = {
    number: 1,
    string: 'hi there',
    boolean: true,
}
console.log('Object value (after)', output.Object)


console.log('--------- Adding nested property to Typed Array ---------')
console.log('Typed array property value (before)', output.Float32.test)
output.Float32.test = true
console.log('Typed array property value (after)', output.Float32.test)
console.log('Typed array property value (original)', object.float32?.test)


const checkPromise = async () => {
    console.log('--------- Checking promise value ---------')
    console.log('Promise value (before)', await output.Promise)
    output.Promise = 20
    console.log('Promise value (after)', await output.Promise)
}
checkPromise()

console.log('--------- Setting undefined ---------')
console.log('Undefined value (before)', output.Undefined)
output.Undefined = 'should have metadata'
console.log('Undefined value (after)',output.Undefined)
