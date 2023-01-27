import { Model } from "../src"

console.log('---------------- ADVANCED DEMO ----------------')
const model = new Model({

    values: (key, value, spec) => value,

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

        if (!(key in spec)) delete info.value // Will be removed

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
        }
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

console.log(john.firstName) // John
console.log(john.lastName) // Doe
console.log(john.fullName) // John Doe
console.log(john.extra) // undefined

john.fullName = 'Jane Doe'
console.log(john.firstName) // Jane
console.log(john.lastName) // Doe
console.log(john.fullName) // Jane Doe