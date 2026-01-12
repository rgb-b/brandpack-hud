// Application version
export const VERSION = '2.0.0'

// localStorage keys used across all tools
export const STORAGE_KEYS = {
  // Inventory System
  INVENTORY: 'printer-inventory',
  USAGE_HISTORY: 'printer-usage-history',

  // Productivity Tracker
  TASKS: 'tasks',
  HISTORY: 'history',
  DAILY_TOTALS: 'dailyTotalsByDate',
  TASK_TOTALS: 'taskTotals',

  // Pantone Tracker
  PANTONE_COLORS: 'pantone-colors',

  // Maintenance Tracker
  MAINTENANCE: 'proofing-maintenance',

  // Master data (for export/import)
  MASTER_DATA: 'brandpack-tools-master'
}

// Tool names
export const TOOLS = {
  LAUNCHER: 'Brandpack Tools Launcher',
  INVENTORY: 'Inventory System',
  PRODUCTIVITY: 'Productivity Tracker',
  PANTONE: 'Pantone Tracker',
  CONVERTER: 'LAB-CMYK Converter',
  MAINTENANCE: 'Maintenance Tracker'
}

// Tool paths (relative from dist/)
export const TOOL_PATHS = {
  LAUNCHER: './launcher.html',
  INVENTORY: './inventory.html',
  PRODUCTIVITY: './productivity.html',
  PANTONE: './pantone.html',
  CONVERTER: './converter.html',
  MAINTENANCE: './maintenance.html'
}

// Printer names for inventory
export const PRINTERS = {
  EPSON_9900: 'Epson 9900/WT7900',
  EPSON_9070: 'Epson 9070',
  ROLAND: 'Roland',
  CANON: 'Canon'
}

// Status categories for productivity tracker
export const STATUS_CATEGORIES = {
  AVAILABLE: 'available',
  WORKING: 'working',
  UNAVAILABLE: 'unavailable'
}

// Initial inventory structure for printers
export const INITIAL_INVENTORY = {
  'Epson 9900/WT7900': {
    'Shared Inks': [
      { id: 'T636200', name: 'T636200 - Cyan', stock: 0, unit: '700ml' },
      { id: 'T636500', name: 'T636500 - Light Cyan', stock: 0, unit: '700ml' },
      { id: 'T636300', name: 'T636300 - Vivid Magenta', stock: 0, unit: '700ml' },
      { id: 'T636600', name: 'T636600 - Vivid Light Magenta', stock: 0, unit: '700ml' },
      { id: 'T636400', name: 'T636400 - Yellow', stock: 0, unit: '700ml' },
      { id: 'T636B00', name: 'T636B00 - Green', stock: 0, unit: '700ml' },
      { id: 'T636A00', name: 'T636A00 - Orange', stock: 0, unit: '700ml' },
      { id: 'T636100', name: 'T636100 - Photo Black', stock: 0, unit: '700ml' },
      { id: 'T636800', name: 'T636800 - Matte Black', stock: 0, unit: '700ml' },
      { id: 'T636700', name: 'T636700 - Light Black', stock: 0, unit: '700ml' },
      { id: 'T636900', name: 'T636900 - Light Light Black', stock: 0, unit: '700ml' },
      { id: 'T596C00', name: 'T596C00 - White (350ml)', stock: 0, unit: '350ml' },
    ],
    'Maintenance': [
      { id: 'C13T642000', name: 'C13T642000 - Cleaning Cartridge', stock: 0, unit: '150ml' },
      { id: 'C12C890191', name: 'C12C890191 - Maintenance Tank', stock: 0, unit: 'unit' },
    ],
    'Media - 9900': [
      { id: 'E-PPO250/44/45', name: 'E-PPO250/44/45 - PearlProof Premium OBA 44"', stock: 0, unit: 'roll' },
    ],
    'Media - WT7900': [
      { id: 'CLEARPROOF', name: 'Epson ClearProof', stock: 0, unit: 'roll' },
    ]
  },
  'Epson 9070': {
    'Inks': [
      { id: 'T55J292', name: 'T55J292 - Cyan', stock: 0, unit: '700ml' },
      { id: 'T55J592', name: 'T55J592 - Light Cyan', stock: 0, unit: '700ml' },
      { id: 'T55J392', name: 'T55J392 - Vivid Magenta', stock: 0, unit: '700ml' },
      { id: 'T55J692', name: 'T55J692 - Vivid Light Magenta', stock: 0, unit: '700ml' },
      { id: 'T55J492', name: 'T55J492 - Yellow', stock: 0, unit: '700ml' },
      { id: 'T55JB92', name: 'T55JB92 - Green', stock: 0, unit: '700ml' },
      { id: 'T55JA92', name: 'T55JA92 - Orange', stock: 0, unit: '700ml' },
      { id: 'T55J192', name: 'T55J192 - Photo Black', stock: 0, unit: '700ml' },
      { id: 'T55J892', name: 'T55J892 - Matte Black', stock: 0, unit: '700ml' },
      { id: 'T55J792', name: 'T55J792 - Light Black', stock: 0, unit: '700ml' },
      { id: 'T55J992', name: 'T55J992 - Light Light Black', stock: 0, unit: '700ml' },
      { id: 'T55JD92', name: 'T55JD92 - Violet', stock: 0, unit: '700ml' },
    ],
    'Media': [
      { id: 'E-PM120/44/45', name: 'E-PM120/44/45 - Matte Coated 120gsm 44"', stock: 0, unit: 'roll' },
    ]
  },
  'Roland': {
    'Inks': [
      { id: 'CT-RXRXG-C', name: 'CT-RXRXG-C - Cyan', stock: 0, unit: '220ml' },
      { id: 'CT-RXRXG-M', name: 'CT-RXRXG-M - Magenta', stock: 0, unit: '220ml' },
      { id: 'CT-RXRXG-Y', name: 'CT-RXRXG-Y - Yellow', stock: 0, unit: '220ml' },
      { id: 'CT-RXRXG-K', name: 'CT-RXRXG-K - Black', stock: 0, unit: '220ml' },
      { id: 'CT-RXRXG-O', name: 'CT-RXRXG-O - Orange', stock: 0, unit: '220ml' },
      { id: 'CT-RXRXG-G', name: 'CT-RXRXG-G - Green', stock: 0, unit: '220ml' },
      { id: 'ESL4-WH', name: 'ESL4-WH - White', stock: 0, unit: '220ml' },
      { id: 'ESL4-MT', name: 'ESL4-MT - Metallic', stock: 0, unit: '220ml' },
    ],
    'Media': [
      { id: 'E-STF030G/24/30', name: 'E-STF030G/24/30 - Transfer Film 24"', stock: 0, unit: 'roll' },
    ],
    'Supplies': [
      { id: '6701409310', name: '6701409310 - Cleaning Kit (fluid + sticks)', stock: 0, unit: 'kit' },
      { id: 'ST-037-50', name: 'ST-037-50 - Cleaning Sticks (50pk)', stock: 0, unit: 'pack' },
    ]
  },
  'Materials': {
    'General': []
  },
  'Misc': {
    'General': []
  }
}
