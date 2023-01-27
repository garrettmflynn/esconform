# esmodel
 `esmodel`  is a JavaScript library that allows you to conform JavaScript objects to an external model. 

 It allows you to transform the **keys** of an object, then uses `setters` to ensure that updated **values** to the output object are transformed. Both transformation functions can use an external **specification** to determine the validity of the transformation.
 
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
console.log(john.firstName) // John
console.log(john.lastName) // Doe
console.log(john.fullName) // undefined
console.log(john.extra) // undefined

john.fullName = 'Jane Doe'
console.log(john.firstName) // Jane
console.log(john.lastName) // Doe
console.log(john.fullName) // undefined
```

## Limitations
1. Since we are not using the `Proxy` object, we cannot react to new properties being added to the object.