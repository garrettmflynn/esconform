import { valueSymbol } from "./globals"
import { transfer } from "./transfer"

export const objectify = (key, value) => {
    const constructor = value?.constructor

    if (constructor) {
        let og = value
        value = new constructor(value) // Try cloning other objects using their constructor
        value = transfer(value, og)
    } else {
        if (!value) {
            const og = value
            value = Object.create(null)
            Object.defineProperty(value, valueSymbol, { value: og })
        }
    }

    return value
}