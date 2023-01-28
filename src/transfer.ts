import { valueSymbol } from "./globals"
import { getAllPropertyNames } from "./properties"
import { ArbitraryObject } from "./types"

export const transfer = (o: ArbitraryObject, toTransfer: ArbitraryObject, descOverride?: Partial<PropertyDescriptor>) => {
    const properties = new Set([...getAllPropertyNames(toTransfer), ...Object.getOwnPropertySymbols(toTransfer)])
    properties.forEach(key => {

        if (
            !(key in o) 
            && key !== valueSymbol // Never transfer values
        ) {
            const desc = Object.getOwnPropertyDescriptor(toTransfer, key) as PropertyDescriptor
            Object.defineProperty(o, key, descOverride ? {...desc, ...descOverride} : desc)
        }
    })
    return o
}