/**
 * This module defines types corresponding to app-level configuration,
 * as well as methods and objects for loading and verifying said configuration.
 */

export type AppMode = "single-user" | "multi-user"

export class AppConfig {
    public readonly mode: AppMode
    public readonly databaseConn: string

    constructor(
        mode: AppMode = "single-user",
        databaseConn: string = "diatomic"
    ) {
        this.mode = mode
        this.databaseConn = databaseConn
    }
}