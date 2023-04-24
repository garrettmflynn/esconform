import { transfer } from './transfer'
import * as transformations from './transformations'
import { ArbitraryObject, RegistrationOptions, UpdateFunctions } from './types'

export type ModelConfig = {
    specification?: ArbitraryObject | ArbitraryObject[]
} & UpdateFunctions


export class Model {

    config: ModelConfig = {}
    specification?: ArbitraryObject

    constructor(config: ModelConfig) {
        this.set(config)
    }

    set = (config: ModelConfig) => {
        this.config = config

        // Merge top level of the specification arrays
        const spec = this.config.specification
        if (Array.isArray(spec)) {
            let acc = this.config.specification = {}
            spec.forEach(o => transfer(acc, o))
        }

        this.specification = this.config.specification
    }

    // Apply model keys AND values to the object
    apply = (o: any, options?: RegistrationOptions) => transformations.apply(o, this.config.specification, this.config, options)

    // Apply model keys to the object
    keys = (o: any, options?: RegistrationOptions) => transformations.keys(o, this.config.specification, this.config.keys, options)

    // Apply model values to the object
    values = (o: any, options?: RegistrationOptions) => transformations.values(o, this.config.specification, this.config.values, options)

} 


