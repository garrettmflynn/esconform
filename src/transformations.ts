import { 
    attachedSpecSymbol,
    newKeySymbol, 
    // propertiesRegistrySymbol, 
    removeSymbol, 
    valueSymbol 
} from "./globals"
import { objectify } from "./presets"
import { getAllPropertyNames } from "./properties"
import { transfer } from "./transfer"
import { ArbitraryObject, HistoryType, InternalMetadata, KeyType, PathType, RegistrationOptions, UpdateFunctions } from "./types"

export const isPromise = (o: any) => o && typeof o === 'object' && typeof o.then === 'function'

function isNumeric (n: any) {
    return !isNaN(parseFloat(n)) && isFinite(n)
}


type ToIterateType = {
    specification?: boolean,
    properties?: boolean
}

const unresolved = Symbol('unresolved')

function hasSpecValue(key: KeyType, specObject: ArbitraryObject, fallbackKey: KeyType) {
    return (key in specObject) || (fallbackKey in specObject)
}

function getSpecKey(key: KeyType, specObject: ArbitraryObject, fallbackKey: KeyType) {
    return (key in specObject) ? key : ((fallbackKey in specObject) ? fallbackKey : undefined)
}

function getSpecValue(key: KeyType, specObject: ArbitraryObject, fallbackKey: KeyType) {
    return ((key in specObject) ? (specObject[key] ?? specObject[fallbackKey]) :  specObject[fallbackKey])
}

const registerAllProperties = (o, specObject: ArbitraryObject, funcs: UpdateFunctions = {}, options: RegistrationOptions = {}, path: PathType = [], history: HistoryType = [], toIterate:ToIterateType = {}) => {


    const first = history.length === 0
    if (first) history.push(o) // Add original object to history
    const willUpdateOriginal = options.target === o //|| options.clone === false
    const acc = (willUpdateOriginal) ? history[history.length - 1] : (first ? options.target ?? {} : o) // Use original object if clone is disabled

    if (newKeySymbol in acc) return o
    else {

        const properties = new Set([...getAllPropertyNames(o), ...Object.getOwnPropertySymbols(o)]) // Get all properties, enumerable or otherwise
        properties.delete('constructor') // No constructor...

        const specKeys = new Set([...getAllPropertyNames(specObject), ...(specObject ? Object.getOwnPropertySymbols(specObject) : [])])

        const registeredProperties = new Set(specKeys)

        const internalMetadata = { willUpdateOriginal }
        const register = (key: KeyType | number, historyArr = history) => {
            if (key === valueSymbol) return // Don't register values that are handled by the spec
            if (typeof key === 'string' && isNumeric(key)) return // Don't register numeric properties
            const registered = registerPropertyUpdate(key as KeyType, path, historyArr, acc, funcs, specObject, options, internalMetadata)
            registered.forEach(key => {
                specKeys.delete(key)
                registeredProperties.add(key)
            })
        }

        let toReturn = acc

        if (toIterate.properties !== false) properties.forEach((k) => register(k)) // Try to register properties provided by the user
        if (toIterate.specification !== false) specKeys.forEach((k) => register(k)) // Register extra specification properties

        
        if (!(newKeySymbol in acc)) Object.defineProperty(acc, newKeySymbol, {
            value: (
                key: KeyType, 
                value: any, 
                desc?: {
                    enumerable: PropertyDescriptor['enumerable'],
                    configurable: PropertyDescriptor['configurable'],
                    writable: PropertyDescriptor['writable'],
                    get: PropertyDescriptor['get'],
                    set: PropertyDescriptor['set'],
                }
            ) => {
                const historyCopy = [...history]
                const parentCopy = historyCopy[historyCopy.length - 1] = (willUpdateOriginal ? o : {...o}) // Copy the parent object to avoid adding new keys
                parentCopy[key] = value

                // Transfer property description (or ensure the new key is defined)
                if (desc) {
                    let propertyDesc = {...desc} as PropertyDescriptor
                    if (!desc.get && !desc.set) propertyDesc.value = value
                    Object.defineProperty(specObject, key, propertyDesc)
                } else specObject[key] = undefined // Ensure the specification object is extended

                register(key, historyCopy)
            },
            writable: false,
            configurable: false
        })

        // If Proxy is available, use it to intercept property setters
        if (globalThis.Proxy) {
            toReturn = new Proxy(acc, {
                set(target, property, value) {
                    if (registeredProperties.has(property)) return Reflect.set(target, property, value) // Only set registered properties
                    return true
                    
                },
            })
        } else console.warn('[esconform] Proxy not available. Unregistered property setters will not be intercepted.')

        return toReturn
    } 
}

// Spit out an object with getters / setters that transform the returned value
const registerPropertyUpdate = (key: KeyType, path:PathType, history: HistoryType, acc: ArbitraryObject, funcs: UpdateFunctions, specObject: ArbitraryObject = {}, options: RegistrationOptions = {}, internalMetadata: InternalMetadata) => {

    const mutate = internalMetadata.willUpdateOriginal
    const parent = history[history.length - 1]
    const updatedPath = [...path, key]
    let resolved: any = unresolved
    // if (!acc[propertiesRegistrySymbol]) Object.defineProperty(acc, propertiesRegistrySymbol, {value: {}, enumerable: false, configurable: false})


    let registered: KeyType[] = [] // A list of keys that have been registered

    const desc = parent ? {...Object.getOwnPropertyDescriptor(parent, key)} as PropertyDescriptor : {}

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

    const _update = isObject ? update.value : update
    const specKey =  getSpecKey(_update, specObject, key)
    const specDesc = specKey ? {...Object.getOwnPropertyDescriptor(specObject, specKey)} as PropertyDescriptor : {}
    const enumerable = (isObject && 'enumerable' in update) ? update.enumerable : specDesc.enumerable ?? desc.enumerable ?? false // Default to existing. Otherwise true if undefined


    const type = typeof _update

    // Allow for ignoring a property (including current and previous values)
    const silence = (isObject && 'silence' in update) ? update.silence : (!hasSpecValue(_update, specObject, key) || (_update == undefined || _update === removeSymbol || (type !== 'string' && type !== 'symbol' && (type === 'object' && (!(_update instanceof String) && !(_update instanceof Number))))))
    const resolvedKey = (silence) ? key : _update  as KeyType  

    if (silence && !links) {
        delete acc[key]
        return registered
    } else registered.push(resolvedKey)

     const existingDesc = Object.getOwnPropertyDescriptor(acc, resolvedKey) ?? {}
     const exists = existingDesc.set && existingDesc.configurable !== true
     if (exists) acc[resolvedKey] = parent[key] // If the property is already defined, set the value to the original value
    else {

        // Set a hidden setter so that updates to the property conform to the model
        function setter(value) {

            // Preprocessing values received from the specification
            // NOTE: Do not set non-standard objects with metadata...
            if (value && typeof value === 'object') {
                    // if (!(fromSpecSymbol in value)) console.warn('May be processing a value that has metadata on it...')
                    // else console.error('FROM SPEC')
                    // delete value[fromSpecSymbol]
                    if (valueSymbol in value) value =  value[valueSymbol] // If the value is a model, get the actual value
                     if (value && typeof value.valueOf === 'function') value = value.valueOf() // If the value is a primitive, get the actual value
                // } else console.error('Not in spec', value, valueSymbol in value, value[valueSymbol])
            }

            // Trigger value update response
            // acc[propertiesRegistrySymbol][resolvedKey] = 
            resolved = onValueUpdate(resolvedKey, value, updatedPath, history, funcs, specObject, options, internalMetadata)
            const toReturn = (valueSymbol in resolved) ? resolved[valueSymbol] : resolved // return actual value (null / undefined)
            // console.warn('Has been set', resolvedKey, toReturn)
            return toReturn
        }

        // Basic getter for the property
        function getter () {

            let toReturn;
            if (silence) return
            else if (resolved === unresolved || internalMetadata.linked) {
                const value = mutate ? (desc.get ? desc.get.call(parent) : desc.value) : (parent ? parent[key] : undefined) //?? getSpecValue(resolvedKey, specObject, key) // Get original from specification as a backup
                toReturn = isPromise(value) ? value.then(setter) : setter(value)
            }
            else toReturn = (valueSymbol in resolved) ? resolved[valueSymbol] : resolved // return actual value (null / undefined)

            // console.error('Returning from getter', resolvedKey, toReturn)
            return toReturn
        }

        // Enhanced getter and setter based on existing property descriptor
        if ((!mutate && Object.getOwnPropertyDescriptor(acc, resolvedKey)?.configurable !== false) || desc?.configurable !== false) {
            Object.defineProperty(acc, resolvedKey, { 
                get: getter,  // Handle promises
                set: desc.set ? (value) => {
                    (desc.set as (v: any) => void)(value);
                    return setter(value);
                } : setter,
                enumerable: silence ? false : enumerable,
                configurable: desc.configurable // Pass on configurability
            })
        }
    }

    // acc[propertiesRegistrySymbol][resolvedKey] = resolved // Store the resolved value

    // Delete old key
    if (key !== resolvedKey) delete acc[key] 

    return registered // return an array of registered keys
}

const onValueUpdate = (resolvedKey: KeyType, value: any, path: PathType, history: HistoryType, funcs: UpdateFunctions, specObject: any, options: RegistrationOptions, internalMetadata: InternalMetadata) => {
    const key = path[path.length - 1]

    // Allow spec extensions to be attached to values
    if (value?.[attachedSpecSymbol]) specObject[resolvedKey] = value[attachedSpecSymbol]

    // Resolve the latest value
    const specValue = getSpecValue(resolvedKey, specObject, key) // Fallback to original key 
    
    let update = funcs.values ? funcs.values(key, value, specValue, path, history) : value

    // Mirror the specification if no update is provided
    if (options.mirror) {
        if (update === undefined) update = specValue
        else if (update && typeof update === 'object' && valueSymbol in update && update[valueSymbol] === undefined) update = transfer({[valueSymbol]: specValue}, update) // transfer anything already on the object
    }

    const updateIsObject = (update && typeof update  === 'object')
    const resolved = (updateIsObject && 'value' in update) ? update.value : update

    const isObject = resolved && resolved?.constructor?.name === 'Object'

    const clone = (
        typeof resolved === 'symbol' ? resolved // Don't clone symbols
        : isObject ? {...resolved}  // Clone objects
            : (Array.isArray(resolved) ? [...resolved] // Clone arrays
                : objectify(resolvedKey, resolved) // Convert primitives to objects
            )
        )

    const historyObject = value ?? resolved
    const specIsObject = (specValue && typeof specValue === 'object')


    // Register properties. Only from the specification if not a simple object
    if (isObject || specIsObject) registerAllProperties(clone, specValue, funcs, options, path, [...history, historyObject], {  properties: isObject }) // Ensure history is full of unmutated objects

    return clone

}

// Apply specification to the keys of this object
export const keys = (object: any, specObject: any, keyUpdateFunction: UpdateFunctions['keys'], options: RegistrationOptions) => registerAllProperties(object, specObject, { keys: keyUpdateFunction }, options)

// Apply specification to the keys AND values of this object
export const apply = (object: any, specObject: any, updateFunctions: UpdateFunctions, options: RegistrationOptions) => registerAllProperties(object, specObject, updateFunctions, options)

// Apply specification to the values of this object
export const values = (object: any, specObject: any, valueUpdateFunction: UpdateFunctions['values'], options: RegistrationOptions) => registerAllProperties(object, specObject, { values: valueUpdateFunction }, options)
