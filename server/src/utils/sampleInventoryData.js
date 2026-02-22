/**
 * Sample inventory data for testing and demonstration
 *
 * This file provides realistic inventory items including:
 * - Epson 9900/WT7900 inks
 * - Roland VS300 inks
 * - Media (vinyl, paper, canvas)
 * - Maintenance supplies
 *
 * All items include barcodes for testing scanner functionality
 */

export const sampleInventoryData = [
  // ============================================================================
  // EPSON 9900/WT7900 INKS
  // ============================================================================
  {
    id: 'T636100',
    name: 'Photo Black - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 3,
    unit: 'cartridge',
    barcode: '010343851931'
  },
  {
    id: 'T636200',
    name: 'Cyan - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 2,
    unit: 'cartridge',
    barcode: '010343851948'
  },
  {
    id: 'T636300',
    name: 'Vivid Magenta - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 2,
    unit: 'cartridge',
    barcode: '010343851955'
  },
  {
    id: 'T636400',
    name: 'Yellow - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 1,
    unit: 'cartridge',
    barcode: '010343851962'
  },
  {
    id: 'T636500',
    name: 'Light Cyan - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 2,
    unit: 'cartridge',
    barcode: '010343851979'
  },
  {
    id: 'T636600',
    name: 'Vivid Light Magenta - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 2,
    unit: 'cartridge',
    barcode: '010343851986'
  },
  {
    id: 'T636700',
    name: 'Light Black - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 3,
    unit: 'cartridge',
    barcode: '010343851993'
  },
  {
    id: 'T636800',
    name: 'Matte Black - 700ml',
    printer: 'Epson 9900/WT7900',
    category: 'Ink',
    stock: 4,
    unit: 'cartridge',
    barcode: '010343852006'
  },

  // ============================================================================
  // ROLAND VS300 INKS
  // ============================================================================
  {
    id: 'ESL3-4CY',
    name: 'Cyan ECO-SOL MAX 3 - 440cc',
    printer: 'Roland VS300',
    category: 'Ink',
    stock: 3,
    unit: 'cartridge',
    barcode: '012345678001'
  },
  {
    id: 'ESL3-4MG',
    name: 'Magenta ECO-SOL MAX 3 - 440cc',
    printer: 'Roland VS300',
    category: 'Ink',
    stock: 3,
    unit: 'cartridge',
    barcode: '012345678002'
  },
  {
    id: 'ESL3-4YE',
    name: 'Yellow ECO-SOL MAX 3 - 440cc',
    printer: 'Roland VS300',
    category: 'Ink',
    stock: 2,
    unit: 'cartridge',
    barcode: '012345678003'
  },
  {
    id: 'ESL3-4BK',
    name: 'Black ECO-SOL MAX 3 - 440cc',
    printer: 'Roland VS300',
    category: 'Ink',
    stock: 4,
    unit: 'cartridge',
    barcode: '012345678004'
  },

  // ============================================================================
  // VINYL MEDIA
  // ============================================================================
  {
    id: 'VINYL-3651',
    name: '3M IJ3651 Vinyl - 54" x 50yd',
    printer: 'Roland VS300',
    category: 'Media',
    stock: 2,
    unit: 'roll',
    barcode: '051131687653'
  },
  {
    id: 'VINYL-180CV3',
    name: '3M 180CV3 Cast Vinyl - 60" x 50yd',
    printer: 'Roland VS300',
    category: 'Media',
    stock: 1,
    unit: 'roll',
    barcode: '051131687660'
  },
  {
    id: 'VINYL-ORACAL',
    name: 'Oracal 3651 White Vinyl - 54" x 50yd',
    printer: 'Roland VS300',
    category: 'Media',
    stock: 3,
    unit: 'roll',
    barcode: '012345670001'
  },

  // ============================================================================
  // PAPER MEDIA
  // ============================================================================
  {
    id: 'PAPER-PHOTO',
    name: 'Premium Luster Photo Paper - 44" x 100ft',
    printer: 'Epson 9900/WT7900',
    category: 'Media',
    stock: 2,
    unit: 'roll',
    barcode: '010343859364'
  },
  {
    id: 'PAPER-CANVAS',
    name: 'Enhanced Matte Canvas - 44" x 40ft',
    printer: 'Epson 9900/WT7900',
    category: 'Media',
    stock: 1,
    unit: 'roll',
    barcode: '010343859371'
  },
  {
    id: 'PAPER-PROOF',
    name: 'Proofing Paper - 44" x 100ft',
    printer: 'Epson 9900/WT7900',
    category: 'Media',
    stock: 3,
    unit: 'roll',
    barcode: '010343859388'
  },

  // ============================================================================
  // LAMINATE
  // ============================================================================
  {
    id: 'LAM-8518',
    name: '3M Scotchcal 8518 Gloss Laminate - 54" x 50yd',
    printer: 'Roland VS300',
    category: 'Laminate',
    stock: 2,
    unit: 'roll',
    barcode: '051131687677'
  },
  {
    id: 'LAM-8519',
    name: '3M Scotchcal 8519 Luster Laminate - 54" x 50yd',
    printer: 'Roland VS300',
    category: 'Laminate',
    stock: 1,
    unit: 'roll',
    barcode: '051131687684'
  },

  // ============================================================================
  // MAINTENANCE SUPPLIES
  // ============================================================================
  {
    id: 'MAINT-WIPER',
    name: 'Roland Wiper Sheets (100 pack)',
    printer: 'Roland VS300',
    category: 'Maintenance',
    stock: 15,
    unit: 'pack',
    barcode: '012345670101'
  },
  {
    id: 'MAINT-CLEAN',
    name: 'Epson Cleaning Cartridge',
    printer: 'Epson 9900/WT7900',
    category: 'Maintenance',
    stock: 2,
    unit: 'unit',
    barcode: '010343852013'
  },
  {
    id: 'MAINT-BLADE',
    name: 'Roland Cutting Blade - 45° (5 pack)',
    printer: 'Roland VS300',
    category: 'Maintenance',
    stock: 8,
    unit: 'pack',
    barcode: '012345670102'
  },
  {
    id: 'MAINT-MAT',
    name: 'Roland Cutting Mat - 12" x 24"',
    printer: 'Roland VS300',
    category: 'Maintenance',
    stock: 5,
    unit: 'unit',
    barcode: '012345670103'
  }
]

/**
 * Get summary of sample data
 */
export function getSampleDataSummary() {
  const byPrinter = {}
  const byCategory = {}

  sampleInventoryData.forEach(item => {
    // Count by printer
    if (!byPrinter[item.printer]) {
      byPrinter[item.printer] = 0
    }
    byPrinter[item.printer]++

    // Count by category
    if (!byCategory[item.category]) {
      byCategory[item.category] = 0
    }
    byCategory[item.category]++
  })

  return {
    totalItems: sampleInventoryData.length,
    byPrinter,
    byCategory
  }
}
