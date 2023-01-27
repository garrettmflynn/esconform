import { transfer } from './transfer'
import * as transformations from './transformations'
import { ArbitraryObject, RegistrationOptions, UpdateFunctions } from './types'

export type ModelConfig = {
    specification?: ArbitraryObject | ArbitraryObject[]
} & UpdateFunctions


export class Model {

    config: ModelConfig = {}

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
    }

    // Apply model keys AND values to the object
    apply = (o, options?: RegistrationOptions) => transformations.apply(o, this.config.specification, this.config, options)

    // Apply model keys to the object
    keys = (o, options?: RegistrationOptions) => transformations.keys(o, this.config.specification, this.config.keys, options)

    // Apply model values to the object
    values = (o, options?: RegistrationOptions) => transformations.values(o, this.config.specification, this.config.values, options)

} 


