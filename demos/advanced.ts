import { Model } from "../src"

console.log('---------------- ADVANCED DEMO ----------------')
const model = new Model({

    values: (key, value, spec) => {
        if (value && spec === 'isodatetime') return new Date(value).toISOString() // Convert to ISO date
         else return value
    },

    keys: (key, spec) => {

        const specVal = spec[key]

        let info: any = {
            value: key,
            enumerable: specVal?.enumerable ?? true // Specify the enumerability of the keys
        }

        // Create two new keys
        if (key === 'fullName') {
            info.links = [
                {key: 'firstName', update: (value) => value.split(' ')[0]}, 
                {key: 'lastName', update: (value) => value.split(' ')[1]}, 
            ]
        }

        if (!(key in spec)) delete info.value // Will be silenced / non-enumerable

        return info
    },

    specification: {
        // fullName: 'string',
        firstName: 'string',
        lastName: 'string',
        age: 'number',
        address: {
            type: 'string',
            enumerable: false
        },
        dateOfBirth: 'isodatetime'
    }
})

const person = {
    fullName: 'John Doe',
    age: 30,
    address: '123 Main St',
    extra: 'THIS IS REALLY ANNOYING'
}

const john = model.apply(person)
console.log('John', john)
console.log('Data', person)

// Properties are transformed based on the specification
console.log('firstName', john.firstName) // Result: John
console.log('lastName', john.lastName) // Result: Doe
console.log('fullName', john.fullName) // Result: undefined

// Properties that are out of the specification are not set
console.log('extra', john.extra, 'extra' in john) // Result: undefined, false

// Properties that are out of the specification will also be blocked
john.extra = 'TEST' // Silenced by Proxy
console.log('extra', john.extra, 'extra' in john) // Result Still: undefined, false

// Linked properties will respond to each other (even if the original key is not in the specification)
john.fullName = 'Jane Doe'
console.log('firstName', john.firstName) // Result: Jane
console.log('lastName', john.lastName) // Result: Doe
console.log('fullName', john.fullName) // Result: undefined

// Properties that are originally missing but present in the specification will be processed
const dob = new Date('1990-01-01')
console.log('DoB', dob) // Result: Sun Dec 31 1989 16:00:00 GMT-0800 (Pacific Standard Time)
john.dateOfBirth = dob
console.log('DoB', john.dateOfBirth) // Result: Sun Dec 31 1989 16:00:00 GMT-0800 (Pacific Standard Time)
