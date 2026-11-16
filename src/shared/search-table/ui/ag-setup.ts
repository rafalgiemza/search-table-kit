import { colorSchemeDark, ModuleRegistry, themeBalham } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllEnterpriseModule])

// Without a key Enterprise runs in trial mode (watermark + console warning).
const licenseKey = import.meta.env.VITE_AG_GRID_LICENSE_KEY as string | undefined
if (licenseKey) LicenseManager.setLicenseKey(licenseKey)

export const gridTheme = themeBalham.withPart(colorSchemeDark).withParams({
  backgroundColor: '#0e1110',
  foregroundColor: '#e6ece8',
  accentColor: '#3ddc84',
  borderColor: '#232a27',
  headerBackgroundColor: '#131716',
  oddRowBackgroundColor: '#0e1110',
  rowHoverColor: '#16201b',
  fontSize: 13,
})
