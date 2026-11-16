import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Import this first in a test that renders hooks: it installs `window` and
 * `document` globals before React Testing Library reads them. Core tests do
 * not import it, so they keep running without a DOM.
 */
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
