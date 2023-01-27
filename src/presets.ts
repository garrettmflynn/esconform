import { valueSymbol } from "./globals"

// The library already transforms everything except undefined / null
export const objectify = (key, value) => {

    if (value == undefined) {
        const og = value
        value = Object.create(null)
        Object.defineProperty(value, valueSymbol, { value: og })
    }

    return value
}