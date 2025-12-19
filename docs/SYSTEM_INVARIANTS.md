# System Invariants

## Purpose
This document defines the **absolute truths** of the SenstoSales system. These invariants must **never** be violated, whether operations are performed by human users or AI agents.

## Core Business Rules

### 1. Purchase Order (PO) Invariants

#### PO-1: Immutable PO Number
- **Rule**: Once a PO is created, its `po_number` cannot be changed
- **Rationale**: PO number is the primary identifier referenced across DCs and Invoices
- **Enforcement**: Database constraint + Service layer validation

#### PO-2: Delivery Quantity Bounds
- **Rule**: Sum of all delivery quantities for a PO item cannot exceed `ord_qty`
- **Formula**: `Σ(delivery.dely_qty) ≤ po_item.ord_qty`
- **Enforcement**: Service layer validation before DC creation

### 2. Delivery Challan (DC) Invariants

#### DC-1: Dispatch Quantity Constraint
- **Rule**: Dispatch quantity cannot exceed remaining quantity for any lot
- **Formula**: `dispatch_qty ≤ (lot_ordered_qty - already_dispatched)`
- **Enforcement**: `services/dc.py::validate_dc_items()`
- **Error**: Raises `BusinessRuleViolation` if violated

#### DC-2: Single Invoice Link
- **Rule**: A DC can be linked to at most ONE invoice
- **Rationale**: Prevents double-billing
- **Enforcement**: Database constraint + `check_dc_has_invoice()` check
- **Error**: Raises `ConflictError` with code `DC_ALREADY_INVOICED`

#### DC-3: PO Reference Integrity
- **Rule**: If a DC references a PO, that PO must exist
- **Enforcement**: Foreign key constraint + service validation
- **Error**: Raises `ResourceNotFoundError` if PO not found

### 3. Invoice Invariants

#### INV-1: Unique Invoice Number
- **Rule**: Invoice numbers must be globally unique
- **Enforcement**: Database unique constraint + `check_invoice_number_exists()`
- **Error**: Raises `ConflictError` with code `INVOICE_NUMBER_EXISTS`

#### INV-2: Server-Side Tax Calculation
- **Rule**: Tax amounts (CGST, SGST, IGST) are **always** calculated by the backend
- **Rationale**: Prevents tampering, ensures accuracy
- **Enforcement**: `services/invoice.py::create_invoice()` recalculates all taxes
- **Client Behavior**: Frontend displays calculated values but cannot override

#### INV-3: Invoice Total Integrity
- **Rule**: `total_invoice_value = taxable_value + cgst + sgst + igst`
- **Enforcement**: Calculated in `create_invoice()`, not accepted from client
- **Verification**: Automated test in test suite

#### INV-4: DC-Invoice Linkage
- **Rule**: An invoice must reference at least one valid DC
- **Enforcement**: Service layer validates DC existence before invoice creation
- **Error**: Raises `ResourceNotFoundError` if DC not found

### 4. Data Integrity Invariants

#### DATA-1: Transaction Atomicity
- **Rule**: All multi-table operations (DC creation, Invoice creation) must be atomic
- **Enforcement**: Database transactions with `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`
- **Location**: Router layer manages transactions

#### DATA-2: No Orphaned Items
- **Rule**: DC items and Invoice items must have valid parent records
- **Enforcement**: Foreign key constraints + cascading deletes
- **Database**: SQLite foreign key enforcement enabled

### 5. AI Safety Invariants

#### AI-1: No LLM Calls in Transactions
- **Rule**: Never make OpenAI/LLM API calls while holding a database lock
- **Rationale**: Prevents long-running transactions, deadlocks
- **Enforcement**: Code review + architectural pattern (LLM calls before transaction)

#### AI-2: Intent Whitelisting
- **Rule**: AI agents can only execute pre-approved functions
- **Whitelist**: `{"create_dc", "query_pending_deliveries"}`
- **Enforcement**: `services/llm_agent.py::process_voice_command()`
- **Error**: Returns safety error if intent not in whitelist

#### AI-3: Validation Before Execution
- **Rule**: All AI-generated parameters must pass the same validation as human input
- **Enforcement**: AI calls same service layer functions as HTTP routers
- **Benefit**: Single source of truth for business rules

### 6. Audit & Traceability Invariants

#### AUDIT-1: Creation Timestamps
- **Rule**: All records must have `created_at` timestamp
- **Enforcement**: Database default value `CURRENT_TIMESTAMP`
- **Usage**: Audit trails, debugging

#### AUDIT-2: Structured Logging
- **Rule**: All business events must be logged in structured JSON format
- **Enforcement**: `utils/structured_logger.py`
- **Usage**: LLM context, debugging, compliance

## Enforcement Layers

### Layer 1: Database Constraints
- Primary keys, foreign keys, unique constraints
- NOT NULL constraints
- CHECK constraints (where applicable)

### Layer 2: Service Layer Validation
- `services/dc.py::validate_dc_items()`
- `services/invoice.py::validate_invoice_header()`
- Raises `DomainError` subclasses

### Layer 3: Router Layer
- Transaction management
- HTTP-specific error handling
- Converts `DomainError` to HTTP responses

### Layer 4: Frontend Validation
- User experience optimization (early feedback)
- **NOT** a security layer (backend is source of truth)

## Violation Handling

### Development
- Violations caught by TypeScript compiler (frontend)
- Violations caught by service layer (backend)
- Unit tests verify invariants

### Production
- Structured logs capture violation attempts
- Errors returned to user/AI with clear messages
- Metrics track violation frequency

## Testing Requirements

Every invariant must have:
1. **Unit Test**: Verifies the rule is enforced
2. **Integration Test**: Verifies end-to-end behavior
3. **Negative Test**: Verifies violation is properly rejected

## Modification Protocol

To modify an invariant:
1. Update this document with rationale
2. Update service layer validation
3. Update database schema if needed
4. Update tests
5. Update API documentation
6. Deploy with migration plan

---

**Last Updated**: 2024-12-19  
**Owner**: Architecture Team  
**Review Frequency**: Quarterly
