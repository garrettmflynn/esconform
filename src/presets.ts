import { valueSymbol } from "./globals"
import { getAllPropertyNames } from "./properties"
import { transfer } from "./transfer"

export const objectify = (key, value) => {
    const constructor = value?.constructor
    const copy =  constructor || !value
    if (copy){
        if (constructor) {
            let og = value
            value = new constructor(value) // Try cloning other objects using their constructor
            value = transfer(value, og)
        } else if (!value) {
            const og = value
            value = Object.create(null)
            Object.defineProperty(value, valueSymbol, { value: og })
        }

        console.log('value', value)
    }

    return value
}