# Loan Lifecycle Implementation - Frontend Integration Guide

## Backend Changes Made

### 1. **Enforced Lifecycle Status Checks** ✓
All endpoints now strictly validate status before allowing actions:

- **Upload Documents**: Only DRAFT or CHANGES_REQUESTED → 400 if otherwise
- **Submit**: Only DRAFT or CHANGES_REQUESTED → 400 if otherwise  
- **Approve/Reject/Request Changes**: Only SUBMITTED → 400 if otherwise
- **Disburse**: Only APPROVED → 400 if otherwise
- **Post Repayment**: Only ACTIVE → 400 if otherwise

### 2. **Loan Context Response Extended** ✓
`GET /api/loan-officer/clients/<client_id>/loan-context/` now returns:

```json
{
  "client": { ... },
  "kyc": { ... },
  "kyc_documents": [ ... ],
  "loans": [ ... ],  // Full history
  "active_loan": { ... },  // For repayments (status=ACTIVE)  
  "application_loan": { ... },  // For uploads/submit (status=DRAFT/CHANGES_REQUESTED)
  "required_documents": [
    {
      "id": 1,
      "name": "Payslip / Salary Statement",
      "code": "PAYSLIP",
      "uploaded": true/false
    },
    ...
  ],
  "uploaded_documents": [
    {
      "id": 1,
      "document_type_id": 1,
      "document_type_name": "Payslip / Salary Statement",
      "file_url": "http://...",
      "uploaded_at": "2026-02-19T..."
    },
    ...
  ],
  "missing_documents": [
    // Only documents with uploaded=false
  ]
}
```

### 3. **DISBURSED Stage Simplified** ✓
- Loan goes directly from APPROVED → ACTIVE (no transient DISBURSED state)
- Reduces confusion and edge cases
- Cashier viewset updated to query APPROVED/ACTIVE only

### 4. **Database Schema Fixed** ✓
- Applied migrations 0020-0022 to:
  - Rename legacy table names (loans_loanschedule → loans_repaymentschedule)
  - Drop legacy/duplicate columns
  - Align all tables with current Django models

---

## Frontend Implementation Tasks

You need to update the Loan Officer context page UI to use:

### **Concept 1: Application Loan (Draft Stage)**
Show this block when `context.application_loan` exists:
```
┌─ APPLICATION LOAN ─────────────────────┐
│ Status: DRAFT / CHANGES_REQUESTED      │
│ Loan ID: 42                            │
│ Product: Agriculture Loan              │
│ Amount: 200,000 XAF                    │
│ Term: 12 months                        │
│                                         │
│ REQUIRED DOCUMENTS                     │
│ ☑ Payslip / Salary Statement          │
│ ☐ Employer Attestation                │
│ ☐ Bank Statement                       │
│                                         │
│ UPLOADED DOCUMENTS                     │
│ • Payslip_2026.pdf (Feb 19)           │
│ • Bank_Statement.pdf (Feb 19)         │
│                                         │
│ [UPLOAD NEW DOCUMENT]  [SUBMIT]        │
│ (Submit only enabled if all required)  │
└─────────────────────────────────────────┘
```

**Key Changes:**
- **Action Buttons** (Upload/Submit) target `context.application_loan.id`
- **Status** shown prominently (DRAFT vs CHANGES_REQUESTED changes meaning)
- **Required/Uploaded/Missing** lists displayed
- **Submit** button disabled if missing_documents.length > 0

### **Concept 2: Active Loan (Repayment Stage)**
Show separately when `context.active_loan` exists:
```
┌─ ACTIVE LOAN ─────────────────────────┐
│ Status: ACTIVE                         │
│ Loan ID: 40                            │
│ Product: Salary Loan                   │
│ Amount: 100,000 XAF                    │
│ Term: 24 months                        │
│ Next Payment Due: March 21, 2026       │
│                                         │
│ [POST REPAYMENT]                       │
│ (Enabled only for ACTIVE loans)        │
└────────────────────────────────────────┘
```

**Key Changes:**
- Show only when status=ACTIVE
- Target `context.active_loan.id` for repayment actions
- No document uploads here

---

## API Response Status Codes

### Success (201 Created)
```
POST /api/loans/
→ 201 with LoanDetailSerializer
→ Frontend shows draft immediately with term_months + interest_rate
```

### Validation Error (400)
```
POST /api/loans/<id>/upload_document/
→ Loan not in DRAFT/CHANGES_REQUESTED
→ 400: "Cannot upload documents to loan in SUBMITTED status..."
```

```
POST /api/loans/<id>/submit/
→ Missing mandatory documents
→ 400: "Missing required documents: Payslip, Bank Statement"
```

### Success Lifecycle
```
DRAFT → (upload docs) → DRAFT → (submit) → SUBMITTED
    ↓                                          ↓
    (branch manager reviews)        APPROVED or CHANGES_REQUESTED
                                        ↓
                                    (disburse) → ACTIVE
                                        ↓
                                  (repay → CLOSED)
```

---

## Recommended Frontend Flow

1. **Create Loan**
   - User selects product
   - POST /api/loans/
   - Response: 201 + LoanDetailSerializer
   - UI: Show draft immediately, enable Upload/Submit buttons

2. **Check Requirements**
   - Poll GET /loan-officer/clients/<id>/loan-context/
   - Display: required_documents, uploaded_documents, missing_documents
   - UI: Progress bar "2/4 documents uploaded"

3. **Upload Documents**
   - User clicks "Upload Social Security Document"
   - POST /api/loans/<application_loan.id>/upload_document/
   - Response: 201 + file metadata
   - UI: Add to uploaded_documents list, update required list

4. **Submit**
   - User clicks "Submit for Approval"
   - Check: if missing_documents.length > 0 → show error
   - Otherwise: POST /api/loans/<application_loan.id>/submit/
   - Response: 200 + LoanDetailSerializer (status → SUBMITTED)
   - UI: Disable Upload/Submit buttons, show "Waiting for approval"

5. **Approval (Branch Manager sees)**
   - BM polls GET /api/branch-manager/loans/submitted/
   - BM clicks Approve/Reject/Request Changes
   - POST /api/.../approve/ or /reject/ or /request-changes/
   - Response: 409 if wrong status, 200 on success
   - On CHANGES_REQUESTED → Loan Officer refresh gets application_loan again

6. **Repayment (Becomes active)**
   - Once APPROVED + disbursed → status = ACTIVE
   - Loan appears in context.active_loan
   - UI: Show "POST REPAYMENT" button
   - Cashier: POST /api/loans/<id>/post_repayment/
   - Response: 201 + RepaymentTransactionSerializer

---

## Key UI Behaviors

### When to Show Buttons
- **Upload/Submit**: Only if `context.application_loan` exists
- **Post Repayment**: Only if `context.active_loan` exists
- **Submit**: Only if `missing_documents.length === 0`

### When to Disable Buttons (Blur)
- **Upload**: If loan status not in [DRAFT, CHANGES_REQUESTED]
- **Submit**: If missing_documents.length > 0
- **Repayment**: If loan status !== ACTIVE

### Error Handling
- 400 errors: Show field-specific JSON validation errors to user
- 409 errors: "This loan is no longer in the correct status" (refresh page)
- 500 errors: "Server error, please contact support"

---

## Testing Endpoints Against Your Changes

```bash
# List active clients in your branch
GET /api/loan-officer/clients/

# Get full context with docs/requirements
GET /api/loan-officer/clients/7/loan-context/

# Create a draft
POST /api/loans/
{
  "client": 7,
  "product": 1,
  "amount": "100000.00",
  "purpose": "Emergency"
}

# Upload required doc
POST /api/loans/42/upload_document/
{
  "document_type": 1,
  "document_file": <file>,
  "label": "Payslip"
}

# Submit for approval (should fail if docs missing)
POST /api/loans/42/submit/

# Branch Manager approve
POST /api/branch-manager/loans/42/approve/

# Cashier disburse (goes directly to ACTIVE)
POST /api/cashier/loans/42/disburse/
{
  "disbursement_method": "BANK_TRANSFER",
  "disbursement_reference": "TXN123"
}

# Post repayment
POST /api/loans/42/post_repayment/
{
  "amount": "5000.00",
  "payment_method": "CASH"
}
```

---

## Migration Summary

Applied migrations:
- `0020_rename_legacy_tables.py` - Renames old table names
- `0021_clean_repaymentschedule_schema.py` - Drops old columns from schedule table
- `0022_clean_transaction_waiver_schema.py` - Drops old columns from transaction/waiver tables

These ensure the DB schema matches the current Django models exactly.
