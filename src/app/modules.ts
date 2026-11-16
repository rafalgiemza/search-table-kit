import { division1Module } from '#modules/division1/index.ts'
import { division2Module } from '#modules/division2/index.ts'
import { division3Module } from '#modules/division3/index.ts'
import type { AppModule } from '#shared/module-contract.ts'

/** Module registry. Adding a module to the app = adding one line here. */
export const modules: AppModule[] = [division1Module, division2Module, division3Module]
