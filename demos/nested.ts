import { Model, } from "../src"

const object = { subject: { name: 'test' }, general: {} } as any // Set the proxy subject

const specification = {

    general: {
        subject: {
            name: 'subject',
        }
    },

} as any

const model = new Model({

    // Transform values to objects
    values: (key, value, spec) => value,

    // Transform keys to uppercase
    keys: (key) => key,

    specification
})

const target = {}
Object.defineProperty(target, 'subject', {
    get: () => target.general.subject ,
    set: (v) => target.general.subject = v
})

const output = model.apply(
    object, 
    { target },
)

console.log('Got!', output.subject.name)