export type NewKeyType = {
    key: KeyType,
    value?: any,
    update?: (value: any) => any,
}

export type ValueUpdateMetadata<ValueType> = {
    value: ValueType,
}

export type KeyUpdateMetadata = {
    enumerable?: boolean,
    links?: NewKeyType[]
} & ValueUpdateMetadata<KeyUpdate>

export type KeyUpdate = KeyType | undefined

export type UpdateFunctions = {
    keys?: (key: KeyType, specObject: ArbitraryObject, path: PathType, history: HistoryType) => KeyUpdate | KeyUpdateMetadata,
    values?: (key: KeyType, value: any, specValue: ArbitraryObject[keyof ArbitraryObject], path: PathType, history: HistoryType) => any | ValueUpdateMetadata<any>,
}
export type ArbitraryObject = {[x:KeyType]: any}
export type KeyType = string | symbol | number
export type PathType = (KeyType)[]
export type HistoryType = any[]