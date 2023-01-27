import { valueSymbol } from "./globals"

export const objectify = (key, value) => {

    const typeOf = typeof value
    let resolvedValue: String | Number | Boolean | Object = value

    if (typeOf === 'string') resolvedValue = new String(value)
    else if (typeOf === 'number') resolvedValue = new Number(value)
    else if (typeOf=== 'boolean') resolvedValue = new Boolean(value)
    else if (!value) {
        const og = value
        resolvedValue = Object.create(null)
        Object.defineProperty(resolvedValue, valueSymbol, { value: og })
    }

    return resolvedValue
}