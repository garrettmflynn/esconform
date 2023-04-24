import { valueSymbol } from "./globals"
import { transfer } from "./transfer"
import { KeyType } from "./types"

export const objectify = (key: KeyType, value: any) => {
    const constructor = value?.constructor

    if (Array.isArray(value)) {
        const og = value
        value = []
        value = transfer(value, og)
    } 
    else if (constructor) {
        let og = value
        if (Array.isArray(value)) value = [...value]
        else value = new constructor(value) // Try cloning other objects using their constructor
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