function assertExists<T>(value: T | undefined | null, name: string): T {
    if (value === undefined || value === null) { throw new Error(`${name} does not have a value.`) }
    return value
}