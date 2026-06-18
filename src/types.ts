// shared/types/index.ts
// Fuente de verdad de tipos compartidos entre frontend y backend.
// Importar desde aquí, nunca redefinir en cada app.

// ─── POS CORE TYPES ───────────────────────────────────────────────────────────

/** Versión del POS activa para el negocio */
export type PosVersion = 'SIN_COMANDERO' | 'CON_COMANDERO'

/** Tipo de pago en mostrador (V1) */
export type PaymentType = 'TOGETHER' | 'SEPARATE'

/** Estado de mesa para POS con comandero (V2) */
export enum TableStatus {
  ABIERTA  = 'ABIERTA',   // tomando orden / cliente comiendo
  LISTA    = 'LISTA',     // orden en sistema, esperando que pidan cuenta
  EN_COBRO = 'EN_COBRO',  // mesero fue a cobrar
  PAGADA   = 'PAGADA',    // cobrada, cliente aún puede estar sentado
  VACIA    = 'VACIA',     // disponible para nuevos clientes
}

/** Item de orden en mesa (V2) */
export interface ComandaOrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number   // centavos
  totalPrice: number  // centavos
  note?: string
}

/** Comensal en una mesa (V2) */
export interface Comensal {
  id: string
  tableId: string
  name: string
  items: ComandaOrderItem[]
  subtotal: number         // centavos
  paymentStatus: 'NO_PAGADO' | 'PAGADO'
  paymentMethod?: PaymentMethod
}

/** Mesa en el POS con comandero (V2) */
export interface ComandaTable {
  id: string
  tableNumber: number
  status: TableStatus
  comensales: Comensal[]
  total: number            // centavos — suma de todos los comensales
  openedAt: string         // ISO 8601
  ticketPrintedAt?: string // ISO 8601 — cuando se imprimió el ticket
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export enum Plan {
  BASIC = 'BASIC',
  PRO = 'PRO',
  MULTI = 'MULTI',
}

export enum EmployeeRole {
  CASHIER = 'CASHIER',   // solo POS mostrador
  WAITER  = 'WAITER',    // solo comandero (mesas)
  KITCHEN = 'KITCHEN',   // solo pantalla de cocina
  ADMIN   = 'ADMIN',     // POS + Dashboard + configuración
  OWNER   = 'OWNER',     // acceso total
}

export enum ProductCategory {
  ICE_CREAM = 'ICE_CREAM',
  COFFEE = 'COFFEE',
  PASTRY = 'PASTRY',
  COMBO = 'COMBO',
  EXTRA = 'EXTRA',
  SNACK = 'SNACK',
  BEVERAGE = 'BEVERAGE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD_TERMINAL = 'CARD_TERMINAL',
  TRANSFER = 'TRANSFER',
  QR = 'QR',
  MIXED = 'MIXED',
}

export enum OrderSource {
  POS = 'POS',
  RAPPI = 'RAPPI',
  UBER_EATS = 'UBER_EATS',
  DIDI_FOOD = 'DIDI_FOOD',
  JUSTO = 'JUSTO',
  OWN_CHANNEL = 'OWN_CHANNEL',
}

export enum OrderStatus {
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED_BALANCED = 'CLOSED_BALANCED',
  CLOSED_SURPLUS = 'CLOSED_SURPLUS',
  CLOSED_DEFICIT = 'CLOSED_DEFICIT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum StockUnit {
  GRAMS = 'GRAMS',
  UNITS = 'UNITS',
  LITERS = 'LITERS',
  MILLILITERS = 'MILLILITERS',
}

export enum ModifierInputType {
  SELECT  = 'SELECT',
  NUMERIC = 'NUMERIC',
  WEIGHT  = 'WEIGHT',
  SIZE    = 'SIZE',
}

export enum DiscountType {
  FIXED   = 'FIXED',
  PERCENT = 'PERCENT',
}

// ─── DTOs / REQUEST BODIES ────────────────────────────────────────────────────

// CreateOrderDto definido abajo junto a los tipos de mesas/comandero

export interface CreateOrderItemDto {
  productId: string
  quantity: number
  unitPrice: number         // centavos
  modifiers?: CreateOrderItemModifierDto[]
  note?: string
}

export interface CreateOrderItemModifierDto {
  optionId: string
  priceDelta: number        // centavos
}

export interface OpenShiftDto {
  branchId: string
  employeeId: string
  openingCash: number       // centavos
}

export interface CloseShiftDto {
  countedCash: number       // centavos
  notes?: string
}

export interface CreateTerminalIntentDto {
  amount: number            // centavos
  orderId: string
  description: string
}

// ─── RESPONSE TYPES ───────────────────────────────────────────────────────────

export interface OrderResponse {
  id: string
  orderNumber: string
  totalAmount: number
  changeAmount: number
  receiptUrl: string | null
  inventoryConflict: boolean
}

export interface DashboardData {
  totalSales: number
  avgTicket: number
  ordersCount: number
  customersCount: number
  breakEvenRemaining: number
  lowStockItems: Array<{ name: string; currentStock: number; minStock: number }>
  salesChart: Array<{ label: string; total: number; count: number }>
  branchSalesChart: Array<Record<string, string | number>>
  topProducts: Array<{ name: string; revenue: number; units: number }>
  salesByMethod: Array<{ method: string; total: number; count: number }>
  salesByCategory: Array<{ category: string; total: number }>
  salesByEmployee: Array<{ name: string; total: number; orders: number }>
  salesByShift: Array<{ shift: string; employee: string; openedAt: string; closedAt: string; total: number; orders: number }>
}

export interface TerminalIntentResponse {
  intentId: string
  clipPaymentRequestId: string
  status: 'pending'
}

export interface TerminalStatusResponse {
  status: PaymentStatus
  transactionId: string | null
}

export interface BulkSyncResponse {
  synced: number
  failed: number
  conflicts: number
  results: Array<{
    tempId: string
    orderId: string
    status: 'ok' | 'conflict' | 'failed' | 'duplicate'
  }>
}

// ─── API RESPONSE WRAPPERS ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ─── MODIFIER CONFIG TYPES ────────────────────────────────────────────────────

/** Ajuste de ingrediente específico para un modificador de opción */
export interface IngredientAdjustment {
  id: string
  inventoryItemId: string  // siempre referencia un item del inventario
  name: string             // denormalizado para display
  quantity: number
  unit: string
}

export interface ModifierOptionConfig {
  id: string
  groupId: string
  name: string
  description?: string       // subtexto para SIZE
  priceDelta: number         // centavos, puede ser negativo
  isDefault?: boolean
  sortOrder: number
  /**
   * Cómo afecta esta opción al inventario:
   * - 'none'     → no descuenta ingredientes (default)
   * - 'multiply' → escala todos los ingredientes base por `ingredientMultiplier`
   * - 'custom'   → usa `ingredientAdjustments` para ingredientes propios
   */
  ingredientMode?: 'none' | 'multiply' | 'custom'
  ingredientMultiplier?: number        // usado cuando mode = 'multiply'
  ingredientAdjustments?: IngredientAdjustment[]  // usado cuando mode = 'custom'
}

interface ModifierGroupConfigBase {
  id: string
  productId: string
  name: string
  required: boolean
  multiple: boolean
  minSelections?: number
  maxSelections?: number
  sortOrder: number
  conditionalOnOptionId?: string | null
}

export interface ModifierGroupConfigSelect extends ModifierGroupConfigBase {
  inputType: ModifierInputType.SELECT
  options: ModifierOptionConfig[]
}

export interface ModifierGroupConfigNumeric extends ModifierGroupConfigBase {
  inputType: ModifierInputType.NUMERIC
  minValue?: number
  maxValue?: number
  step?: number
  unit?: string
  pricePerUnit?: number  // centavos
  options?: never
}

export interface ModifierGroupConfigWeight extends ModifierGroupConfigBase {
  inputType: ModifierInputType.WEIGHT
  minValue?: number
  maxValue?: number
  step?: number
  unit?: string
  pricePerUnit?: number  // centavos
  weightPresets?: number[]  // grams
  options?: never
}

export interface ModifierGroupConfigSize extends ModifierGroupConfigBase {
  inputType: ModifierInputType.SIZE
  options: ModifierOptionConfig[]
}

export type ModifierGroupConfig =
  | ModifierGroupConfigSelect
  | ModifierGroupConfigNumeric
  | ModifierGroupConfigWeight
  | ModifierGroupConfigSize

// ─── CART TYPES ───────────────────────────────────────────────────────────────

export interface CartItemModifier {
  optionId: string
  optionName: string
  priceDelta: number  // centavos
}

export interface CartItem {
  localId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number  // centavos
  modifiers: CartItemModifier[]  // always an array; use [] for products with no modifiers
  note?: string
  guestIndex?: number  // 0 or undefined = unassigned, 1+ = guest N
}

export interface CartDiscount {
  type: DiscountType
  value: number  // centavos when FIXED; integer percentage (e.g. 10 = 10%) when PERCENT
  reason: string
}

// ─── UTILITY TYPES ────────────────────────────────────────────────────────────

/** Convierte centavos a pesos formateados: 3500 → "$35.00" */
export type CentsToMXN = (cents: number) => string

/** Verifica que un valor es una clave válida de un enum */
export type EnumKey<T> = keyof T

// ─── MESAS Y COMANDERO ────────────────────────────────────────────────────────

export enum TableSessionStatus {
  OPEN   = 'OPEN',
  CLOSED = 'CLOSED',
  MERGED = 'MERGED',
}

export enum KitchenOrderStatus {
  PENDING   = 'PENDING',
  PREPARING = 'PREPARING',
  READY     = 'READY',
  DELIVERED = 'DELIVERED',
}

export enum DeliveryPlatform {
  RAPPI      = 'RAPPI',
  UBER_EATS  = 'UBER_EATS',
  DIDI_FOOD  = 'DIDI_FOOD',
  JUSTO      = 'JUSTO',
}

export enum DeliveryOrderStatus {
  NEW        = 'NEW',
  ACCEPTED   = 'ACCEPTED',
  PREPARING  = 'PREPARING',
  READY      = 'READY',
  DELIVERED  = 'DELIVERED',
  CANCELLED  = 'CANCELLED',
  REJECTED   = 'REJECTED',
}

export enum CfdiStatus {
  ACTIVE    = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export interface TableConfig {
  id: string
  branchId: string
  name: string
  capacity: number
  positionX: number
  positionY: number
  status: 'available' | 'occupied' | 'merging' | 'merged'
  sessionId: string | null
  waiterId: string | null
  waiterName: string | null
  mergedWith: string[]
}

export interface TableSessionSummary {
  id: string
  tableId: string
  tableName: string
  waiterId: string
  waiterName: string
  guestCount: number
  openedAt: string
  orders: Array<{ id: string; totalAmount: number; createdAt: string }>
  totalAccumulated: number
}

export interface KitchenQueueItem {
  id: string
  orderNumber: string
  tableId: string | null
  tableName: string | null
  source: OrderSource | DeliveryPlatform
  status: KitchenOrderStatus
  items: Array<{ name: string; quantity: number; modifiers: string[]; note?: string }>
  createdAt: string
  startedAt: string | null
  readyAt: string | null
}

export interface DeliveryOrderSummary {
  id: string
  platform: DeliveryPlatform
  externalOrderId: string
  status: DeliveryOrderStatus
  autoAccepted: boolean
  items: Array<{ name: string; quantity: number; price: number; modifiers: string[] }>
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  estimatedReadyAt: string | null
}

export interface ProfilePermissions {
  role: EmployeeRole
  isShared: boolean             // shared terminal — universal PIN, not tied to a person
  canAccessPOS: boolean
  canAccessDashboard: boolean
  canAccessComandero: boolean
  canAccessKitchen: boolean
  canManageTables: boolean
  canAddTables: boolean
  canApplyDiscounts: boolean
  canCancelOrders: boolean
  canViewReports: boolean
  canManageInventory: boolean
  canManageEmployees: boolean
  canManageProducts: boolean
  canIssueInvoices: boolean
  canSkipShiftOpen: boolean     // enter POS without opening a shift (requires admin PIN to enable)
  canSkipShiftClose: boolean    // leave POS without closing shift  (requires admin PIN to enable)
}

export interface CfdiCustomerData {
  rfc: string
  name: string
  email?: string | null
  domicilioFiscalReceptor: string
  regimenFiscalReceptor: string
  usoCfdi: string
}

export interface CreateOrderDto {
  id: string
  branchId: string
  employeeId: string
  shiftId: string
  tableSessionId?: string
  paymentMethod: PaymentMethod
  items: CreateOrderItemDto[]
  totalAmount: number
  discountAmount?: number
  discountReason?: string
  tipAmount?: number
  cashReceived?: number
  source?: OrderSource
  externalOrderId?: string
  createdAt?: string
}
