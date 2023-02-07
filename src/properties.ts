
// ------------ Get All Property Names ------------

const rawProperties = {}
const globalObjects = [
    'Object', 
    'Array', 
    'Map', 
    'Set', 
    'Number', 
    'Boolean', 
    'String',
    'Date',
    'RegExp',
    'Function',
    'Promise',
    'Symbol',
    'BigInt',
    'Error',
    'Float32Array',
    'Float64Array',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Uint8Array',
    'Uint16Array',
    'Uint32Array',
    'Uint8ClampedArray',
    'ArrayBuffer',
    'SharedArrayBuffer',
]

export function getAllPropertyNames( obj: any ) {

    var props: (string | number)[] = [];
    if (obj) {
        do {

            const name = obj.constructor?.name 
            const isGlobalObject = globalObjects.includes(name)
            if (globalObjects.includes(name)) {
                if (!rawProperties[name]) rawProperties[name] = [...Object.getOwnPropertyNames(globalThis[name].prototype)]
            }

            Object.getOwnPropertyNames( obj ).forEach(function ( prop ) {
                if (isGlobalObject && rawProperties[name].includes(prop)) return; // Skip inbuilt class prototypes
                if ( props.indexOf( prop ) === -1 ) props.push( prop )
            });
            
        } while ( obj = Object.getPrototypeOf( obj ));
    }

    return props;
}