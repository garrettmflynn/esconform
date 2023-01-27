import * as transformations from './transformations'
import { UpdateFunctions } from './types'

export type ModelConfig = {
    specification?: any
} & UpdateFunctions

export class Model {

    config: ModelConfig = {}

    constructor(config: ModelConfig) {
        this.set(config)
    }

    set = (config: ModelConfig) => this.config = config

    // Apply model keys AND values to the object
    apply = (o, spec: any = this.config.specification) => transformations.apply(o, spec, this.config)

    // Apply model keys to the object
    keys = (o, spec: any = this.config.specification) => transformations.keys(o, spec, this.config.keys)

    // Apply model values to the object
    values = (o, spec: any = this.config.specification) => transformations.values(o, spec, this.config.values)

} 


