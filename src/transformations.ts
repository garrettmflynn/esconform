import { removeSymbol } from "./globals"
import { getAllPropertyNames } from "./properties"
import { ArbitraryObject, HistoryType, InternalMetadata, KeyType, PathType, RegistrationOptions, UpdateFunctions } from "./types"

export const isPromise = (o: any) => o && typeof o === 'object' && typeof o.then === 'function'


const unresolved = Symbol('unresolved')


const registerAllProperties = (o, specObject: ArbitraryObject, funcs: UpdateFunctions = {}, options: RegistrationOptions = {}, path: PathType = [], history: HistoryType = []) => {

    const first = history.length === 0
    if (first) history.push(o) // Add original object to history
    const willUpdateOriginal = options.target === o //|| options.clone === false
    const acc = (willUpdateOriginal) ? history[history.length - 1] : (first ? options.target ?? {} : o) // Use original object if clone is disabled

    const properties = new Set([...getAllPropertyNames(o), ...Object.getOwnPropertySymbols(o)]) // Get all properties, enumerable or otherwise
    const specKeys = new Set([...getAllPropertyNames(specObject), ...Object.getOwnPropertySymbols(specObject)])

    const registeredProperties = new Set(specKeys)

    const register = (key: KeyType) => {
        const registered = registerPropertyUpdate(key, path, history, acc, funcs, specObject, options, { willUpdateOriginal })
        registered.forEach(key => {
            specKeys.delete(key)
            registeredProperties.add(key)
        })
    }

    properties.forEach(register) // Try to register properties provided by the user
    specKeys.forEach(register) // Register extra specification properties

    let toReturn = acc

    // If Proxy is available, use it to intercept property setters
    if (globalThis.Proxy) {
        toReturn = new Proxy(acc, {
            set(target, property, value) {
                if (registeredProperties.has(property)) target[property] = value // Only set registered properties
                // else console.error('Not setting', property)
            },
        })
    } else console.warn('[esmodel] Proxy not available. Unregistered property setters will not be intercepted.')

    return toReturn
}

// Spit out an object with getters / setters that transform the returned value
const registerPropertyUpdate = (key: KeyType, path:PathType, history: HistoryType, acc: ArbitraryObject, funcs: UpdateFunctions, specObject: ArbitraryObject = {}, options: RegistrationOptions = {}, internalMetadata: InternalMetadata) => {

    const mutate = internalMetadata.willUpdateOriginal
    const parent = history[history.length - 1]
    const updatedPath = [...path, key]
    let resolved: any = unresolved

    let registered: KeyType[] = [] // A list of keys that have been registered

    const desc = {...Object.getOwnPropertyDescriptor(parent, key)} as PropertyDescriptor

    // Resolve any changes to the key
    const update = funcs.keys ? funcs.keys(key, specObject, path, history) : key

    const isObject = (update && typeof update  === 'object')

    const links = isObject ? update.links : undefined
    // Add additional keys to the resulting object
    if (links) {
        for (let o of links) {

            const parentCopy = history[history.length - 1] = (mutate ? parent : {...parent}) // Copy the parent object to avoid adding new keys

            registered.push(o.key)

            // Link the new property to the parent
            if (typeof o.update === 'function') {
                let value: any = unresolved

                const onUpdate = o.update

                function getter() {
                    const res = 'value' in o ? o.value : (resolved !== unresolved) ? resolved : (mutate ? (desc.get ? desc.get.call(parent) : desc.value) : parent[key]) // Get original parent value
                    value = isPromise(res) ? res.then(setter) : setter(res)
                    return onUpdate(value)
                }

                function setter(value) {
                    value = onValueUpdate(o.key, value, [...path, o.key], history, funcs, specObject, options, internalMetadata)
                    return value
                }

                Object.defineProperty(parentCopy, o.key, {
                    get: getter, // Transform from parent 
                    set: (v) => {
                        value = v
                        return value
                    }
                })
            } else parentCopy[o.key] = o.value
            
            registerPropertyUpdate(o.key, path, history, acc, funcs, specObject, options, {...internalMetadata, linked: true})
        }
    }

    const enumerable = isObject ? (update.enumerable === false ? false : true) : true
    const _update = isObject ? update.value : update
    const type = typeof _update

    // Allow for ignoring a property (including current and previous values)
    const silence = (_update == undefined || _update === removeSymbol || ( type !== 'string' && type !== 'symbol')) 


    const resolvedKey = (silence) ? key : _update

    if (silence && !links) {
        delete acc[key]
        return registered
    }
     else registered.push(resolvedKey)

    // Set a hidden setter so that updates to the property conform to the model
    function setter(value) {
        resolved = onValueUpdate(resolvedKey, value, updatedPath, history, funcs, specObject, options, internalMetadata)
        return resolved
    }

    // Basic getter for the property
    function getter () {
        if (silence) return
        else if (resolved === unresolved || internalMetadata.linked) {
            const value = mutate ? (desc.get ? desc.get.call(parent) : desc.value) : parent[key]
            return isPromise(value) ? value.then(setter) : setter(value)
        }
        else return resolved
    }

    // Enhanced getter and setter based on existing property descriptor
    if (!mutate || desc?.configurable !== false) {
        Object.defineProperty(acc, resolvedKey, { 
            get: getter,  // Handle promises
            set: desc.set ? (value) => {
                (desc.set as (v: any) => void)(value);
                return setter(value);
            } : setter,
            enumerable: silence ? false : enumerable,
            configurable: false
        })
    }

    // Delete old key
    if (key !== resolvedKey) delete acc[key] 

    return registered // return an array of registered keys
}

const onValueUpdate = (resolvedKey: KeyType, value: any, path: PathType, history: HistoryType, funcs: UpdateFunctions, specObject: any, options: RegistrationOptions, internalMetadata: InternalMetadata) => {
    const key = path[path.length - 1]

    const specValue = (resolvedKey in specObject) ? (specObject[resolvedKey] ?? specObject[key]) :  specObject[key] // Fallback to original key 
    const update = funcs.values ? funcs.values(key, value, specValue, path, history) : value

    const updateIsObject = (update && typeof update  === 'object')
    const resolved = (updateIsObject && 'value' in update) ? update.value : update

    const isObject = resolved && resolved?.constructor?.name === 'Object'

    const clone = (
        typeof resolved === 'symbol' ? resolved // Don't clone symbols
        : isObject ? {...resolved}  // Clone objects
            : (Array.isArray(resolved) ? [...resolved] // Clone arrays
                : ((resolved?.constructor) ? new resolved.constructor(resolved) // Try cloning other objects using their constructor
                    : resolved // Just return the updated value
                )
            )
        )

    // Register properties on simple objects
    if (isObject) registerAllProperties(clone, specValue, funcs, options, path, [...history, value]) // Ensure history is full of unmutated objects

    return clone

}

// Apply specification to the keys of this object
export const keys = (object: any, specObject: any, keyUpdateFunction: UpdateFunctions['keys'], options: RegistrationOptions) => registerAllProperties(object, specObject, { keys: keyUpdateFunction }, options)

// Apply specification to the keys AND values of this object
export const apply = (object: any, specObject: any, updateFunctions: UpdateFunctions, options: RegistrationOptions) => registerAllProperties(object, specObject, updateFunctions, options)

// Apply specification to the values of this object
export const values = (object: any, specObject: any, valueUpdateFunction: UpdateFunctions['values'], options: RegistrationOptions) => registerAllProperties(object, specObject, { values: valueUpdateFunction }, options)
