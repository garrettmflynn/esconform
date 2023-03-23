export type NewKeyType = {
    key: KeyType,
    value?: any,
    update?: (value: any) => any,
}

export type ValueUpdateMetadata<ValueType> = {
    value: ValueType,
}

export type KeyUpdateMetadata = {
    silence?: boolean,
    links?: NewKeyType[]
} & ValueUpdateMetadata<KeyUpdate>

export type KeyUpdate =  any | KeyType | undefined

export type UpdateFunctions = {
    keys?: (key: KeyType, specObject: ArbitraryObject, path: PathType, history: HistoryType) => KeyUpdate | KeyUpdateMetadata,
    values?: (key: KeyType, value: any, specValue: ArbitraryObject[keyof ArbitraryObject], specObject: ArbitraryObject, path: PathType, history: HistoryType) => any | ValueUpdateMetadata<any>,
}
export type ArbitraryObject = {[x:KeyType]: any}
export type KeyType = string | symbol
export type PathType = (KeyType)[]
export type HistoryType = any[]

export type RegistrationOptions = {
    target?: ArbitraryObject,
    mirror?: boolean,
}

export type InternalMetadata = {
    willUpdateOriginal: boolean,
    linked?: boolean
}