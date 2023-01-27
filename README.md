# esmodel
 `esmodel`  is a JavaScript library that allows you to conform JavaScript objects to an external model. 

 It allows you to transform the **keys** of an object, then uses `setters` to ensure that updated **values** to the output object are transformed. Both transformation functions can use an external **specification** to determine the validity of the transformation.

 All values besides **null** and **undefined** are transformed to their corresponding JavaScript Objects (e.g. this 'string' will be transformed into a new String('string')).
 
 ### Usage

 ```js
const newModel = new Model({

    values: (key, value, spec) => value,

    keys: (key, spec) => {

        const specVal = spec[key]

        let info = {
            value: key, // Specify the new key
            enumerable: specVal?.enumerable ?? true // Specify enumerability
        }

        // Specify links to the new key
        if (key === 'fullName') {
            info.links = [
                {key: 'firstName', update: (value) => value.split(' ')[0]}, 
                {key: 'lastName', update: (value) => value.split(' ')[1]}, 
            ]
        }

        if (!(key in spec)) delete info.value // Silence key if not in spec

        return info
    },

    specification: {
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

```