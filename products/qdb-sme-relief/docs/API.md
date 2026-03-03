# QDB SME Relief Portal — API Contract Specification

**Product**: QDB SME Relief Portal
**Version**: v1 (planned — no backend yet in prototype)
**Date**: March 3, 2026
**Status**: Contract Specification — Ready for Backend Implementation

---

## Overview

This document specifies the complete REST API contract for the QDB SME Relief Portal backend. The
API is not yet implemented (the current codebase is a Next.js prototype using mock data). This
specification is the source of truth for Sprint 1 backend implementation.

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:5014/api/v1` |
| Staging | `https://staging-relief.qdb.com.qa/api/v1` |
| Production | `https://sme-relief.qdb.com.qa/api/v1` |

---

## Authentication

All protected endpoints require a Bearer token issued by the portal after NAS authentication.

```
Authorization: Bearer <portal_jwt_token>
```

Admin-only endpoints require a Bearer token where the JWT payload includes `role: "admin"`.

**Token lifetime**: Access token 30-minute inactivity window; 8-hour absolute maximum.
**Refresh**: POST `/auth/refresh` before expiry using the httpOnly refresh token cookie.

---

## Common Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human readable message in English",
    "message_ar": "رسالة مقروءة بالعربية",
    "details": {}
  }
}
```

---

## Authentication Endpoints

### POST /auth/nas/callback

Handles the NAS / Tawtheeq OIDC callback. Exchanges the authorization code for tokens, validates
the ID token, extracts the QID claim, and issues a portal JWT session.

**Auth required**: No

**Request Body**

```json
{
  "code": "nas_authorization_code_here",
  "state": "csrf_state_token_here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Authorization code from NAS callback |
| `state` | string | Yes | CSRF state token for validation |

**Success Response — 200 OK**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "user": {
    "qid": "28712345678",
    "name": "Khalid Al-Mansouri",
    "name_ar": "خالد المنصوري",
    "assurance_level": 2
  }
}
```

Note: The refresh token is set as an httpOnly Secure cookie, not returned in the body.

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_STATE` | CSRF state mismatch — possible replay attack |
| 401 | `NAS_AUTH_FAILED` | NAS returned an error code (access_denied, etc.) |
| 503 | `NAS_UNAVAILABLE` | NAS token endpoint timed out or returned 5xx |

**curl Example**

```bash
curl -X POST http://localhost:5014/api/v1/auth/nas/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "nas_auth_code_abc123",
    "state": "csrf_state_xyz789"
  }'
```

---

### POST /auth/logout

Invalidates the current portal session. Clears the refresh token cookie.

**Auth required**: Yes

**Request Body**: None

**Success Response — 200 OK**

```json
{
  "message": "Session terminated successfully"
}
```

**curl Example**

```bash
curl -X POST http://localhost:5014/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /auth/me

Returns the current authenticated user's profile from the session token.

**Auth required**: Yes

**Success Response — 200 OK**

```json
{
  "qid": "28712345678",
  "name": "Khalid Al-Mansouri",
  "name_ar": "خالد المنصوري",
  "role": "applicant",
  "language_preference": "ar",
  "assurance_level": 2,
  "session_expires_at": "2026-03-03T12:30:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `SESSION_EXPIRED` | Token expired or invalid |

---

## Company Endpoints

### POST /company/lookup

Queries the MOCI API by CR number and returns verified company data. Also cross-references the
authenticated user's QID against the returned signatory list.

**Auth required**: Yes

**Request Body**

```json
{
  "cr_number": "1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cr_number` | string | Yes | 10-digit Commercial Registration number |

**Success Response — 200 OK**

```json
{
  "cr_number": "1234567890",
  "name_en": "Al Mansouri Trading LLC",
  "name_ar": "شركة المنصوري للتجارة ذ.م.م",
  "status": "active",
  "registration_date": "2021-03-15",
  "sector": "wholesale_trade",
  "employee_count": 42,
  "capital_qar": 500000,
  "signatory_check": {
    "result": "authorized",
    "signatory_name": "Khalid Al-Mansouri",
    "signatory_name_ar": "خالد المنصوري",
    "declaration_required": false
  },
  "source": "moci_api",
  "fetched_at": "2026-03-03T10:45:00Z"
}
```

The `signatory_check.result` field values:
- `"authorized"` — QID matched in MOCI signatory list
- `"not_authorized"` — QID not in signatory list; application blocked
- `"declaration_required"` — MOCI returned no signatory data; statutory declaration prompted

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_CR_FORMAT` | CR number is not 10 digits |
| 404 | `CR_NOT_FOUND` | CR number not found in MOCI records |
| 422 | `CR_INACTIVE` | CR status is inactive, suspended, or cancelled |
| 422 | `NOT_AUTHORIZED_SIGNATORY` | Authenticated QID is not an authorized signatory |
| 409 | `DUPLICATE_APPLICATION` | Active application already exists for this CR number |
| 503 | `MOCI_UNAVAILABLE` | MOCI API timed out or returned 5xx |

**curl Example**

```bash
curl -X POST http://localhost:5014/api/v1/company/lookup \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"cr_number": "1234567890"}'
```

---

### GET /company/:cr_number

Returns cached company data for a given CR number (from the current session).

**Auth required**: Yes

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cr_number` | string | 10-digit CR number |

**Success Response — 200 OK**: Same shape as POST /company/lookup success response.

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 404 | `COMPANY_NOT_IN_SESSION` | Company data not found for this session |

---

## Application Endpoints

### POST /applications

Creates a new application record. Called after company lookup succeeds and the user proceeds.

**Auth required**: Yes

**Request Body**

```json
{
  "cr_number": "1234567890",
  "language_preference": "ar",
  "signatory_declaration": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cr_number` | string | Yes | Verified CR number |
| `language_preference` | string | Yes | `"ar"` or `"en"` |
| `signatory_declaration` | boolean | No | True if statutory declaration was provided (MOCI data gap) |

**Success Response — 201 Created**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cr_number": "1234567890",
  "status": "draft",
  "language_preference": "ar",
  "created_at": "2026-03-03T10:50:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 409 | `DUPLICATE_APPLICATION` | Application already exists for this CR in this relief period |
| 422 | `COMPANY_VERIFICATION_REQUIRED` | Company must be verified via POST /company/lookup first |

---

### GET /applications/:id

Returns the full application record including status, eligibility result, NRGP check, and document list.

**Auth required**: Yes (own application) or Admin (any application)

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Application ID |

**Success Response — 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cr_number": "1234567890",
  "status": "submitted",
  "crm_case_id": "CAS-2026-00412",
  "crm_case_type": "auto_nrgp",
  "route": "auto",
  "language_preference": "ar",
  "eligibility_result": {
    "eligible": true,
    "criteria": [
      {"code": "EC-001", "passed": true, "reason": null},
      {"code": "EC-002", "passed": true, "reason": null},
      {"code": "EC-003", "passed": true, "reason": null},
      {"code": "EC-004", "passed": true, "reason": null},
      {"code": "EC-005", "passed": true, "reason": null},
      {"code": "EC-006", "passed": true, "reason": null},
      {"code": "EC-007", "passed": true, "reason": null}
    ],
    "evaluated_at": "2026-03-03T10:52:00Z"
  },
  "nrgp_check_result": {
    "found": true,
    "list_version": "v3",
    "route": "auto",
    "checked_at": "2026-03-03T10:53:00Z"
  },
  "wps_validation_result": {
    "status": "pass",
    "employee_count": 42,
    "total_salary_90d_qar": 1050000.00,
    "discrepancy_pct": null,
    "validated_at": "2026-03-03T11:00:00Z"
  },
  "documents": [
    {
      "id": "doc-uuid-1",
      "doc_type": "salary_evidence",
      "filename": "payroll_nov2025.pdf",
      "validated": true,
      "uploaded_at": "2026-03-03T10:55:00Z"
    }
  ],
  "created_at": "2026-03-03T10:50:00Z",
  "submitted_at": "2026-03-03T11:05:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 403 | `FORBIDDEN` | Application belongs to different user (non-admin) |
| 404 | `NOT_FOUND` | Application ID not found |

---

### GET /applications

Returns the list of applications. For regular users: their own applications only. For admins: all applications with filter support.

**Auth required**: Yes

**Query Parameters (Admin only)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `disbursed` |
| `route` | string | Filter by route: `auto`, `manual` |
| `cr_number` | string | Filter by CR number |
| `from_date` | date | Filter from submission date (ISO 8601) |
| `to_date` | date | Filter to submission date (ISO 8601) |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Results per page (default: 20, max: 100) |

**Success Response — 200 OK**

```json
{
  "applications": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "cr_number": "1234567890",
      "company_name": "Al Mansouri Trading LLC",
      "status": "submitted",
      "crm_case_id": "CAS-2026-00412",
      "route": "auto",
      "submitted_at": "2026-03-03T11:05:00Z",
      "days_since_submission": 0
    }
  ],
  "pagination": {
    "total": 1247,
    "page": 1,
    "per_page": 20,
    "total_pages": 63
  }
}
```

---

### PATCH /applications/:id/submit

Submits a complete application. Validates that all required documents are uploaded and validated
before allowing submission. Triggers final audit write.

**Auth required**: Yes (own application)

**Request Body**: None (all data already on the application record)

**Success Response — 200 OK**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "submitted",
  "crm_case_id": "CAS-2026-00412",
  "submitted_at": "2026-03-03T11:05:00Z",
  "message": "Your application has been submitted. Your case reference is CAS-2026-00412.",
  "message_ar": "تم تقديم طلبك. رقم مرجع قضيتك هو CAS-2026-00412."
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_REQUIRED_DOCUMENTS` | Not all required documents are uploaded and validated |
| 409 | `ALREADY_SUBMITTED` | Application already in submitted state |
| 422 | `ELIGIBILITY_NOT_RUN` | Eligibility check has not been completed |

---

## Eligibility Endpoints

### POST /applications/:id/check-eligibility

Runs the eligibility engine against the application's MOCI data and WPS records. Returns per-criterion
results with reason codes.

**Auth required**: Yes (own application)

**Request Body**: None (uses data already on the application)

**Success Response — 200 OK**

```json
{
  "application_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eligible": true,
  "criteria": [
    {
      "code": "EC-001",
      "name": "Active Commercial Registration",
      "name_ar": "سجل تجاري ساري المفعول",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-002",
      "name": "Company registered before 01/01/2024",
      "name_ar": "الشركة مسجلة قبل 01/01/2024",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-003",
      "name": "SME classification (under 250 employees)",
      "name_ar": "تصنيف المنشأة الصغيرة والمتوسطة (أقل من 250 موظف)",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-004",
      "name": "Active WPS enrollment",
      "name_ar": "مسجل في نظام حماية الأجور",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-005",
      "name": "Operating in impacted sector or declared revenue decline",
      "name_ar": "يعمل في قطاع متضرر أو يعاني من انخفاض في الإيرادات",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-006",
      "name": "No existing QDB non-performing loan",
      "name_ar": "لا توجد قروض متعثرة لدى بنك قطر للتنمية",
      "passed": true,
      "reason": null,
      "reason_ar": null
    },
    {
      "code": "EC-007",
      "name": "No judicial dissolution order",
      "name_ar": "لا يوجد أمر تصفية قضائية",
      "passed": true,
      "reason": null,
      "reason_ar": null
    }
  ],
  "criteria_snapshot_version": "2026-03-01",
  "evaluated_at": "2026-03-03T10:52:00Z"
}
```

**Ineligibility Example (EC-001 and EC-006 failing)**

```json
{
  "application_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "eligible": false,
  "criteria": [
    {
      "code": "EC-001",
      "name": "Active Commercial Registration",
      "name_ar": "سجل تجاري ساري المفعول",
      "passed": false,
      "reason": "CR expired on 15/06/2023. Please renew at MOCI.",
      "reason_ar": "انتهى السجل التجاري في 15/06/2023. يرجى التجديد في وزارة التجارة والصناعة."
    },
    {
      "code": "EC-006",
      "name": "No existing QDB non-performing loan",
      "name_ar": "لا توجد قروض متعثرة لدى بنك قطر للتنمية",
      "passed": false,
      "reason": "NPL balance on record: QAR 120,000. Contact QDB to resolve before applying.",
      "reason_ar": "رصيد القروض المتعثرة: 120,000 ريال قطري. يرجى التواصل مع بنك قطر للتنمية لحل المشكلة قبل التقديم."
    }
  ],
  "evaluated_at": "2026-03-03T10:52:00Z"
}
```

---

### POST /applications/:id/check-nrgp

Checks the application's CR number against the current active NRGP beneficiary list. Returns the
disbursement route determination.

**Auth required**: Yes (own application; eligibility must pass first)

**Request Body**: None

**Success Response — 200 OK**

```json
{
  "application_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cr_number": "1234567890",
  "found": true,
  "route": "auto",
  "list_version": "v3",
  "list_record_count": 3847,
  "checked_at": "2026-03-03T10:53:00Z",
  "message": "Your company is listed as a previous NRGP beneficiary. Your application will be processed automatically.",
  "message_ar": "شركتك مدرجة كمستفيد سابق من برنامج NRGP. سيتم معالجة طلبك تلقائياً."
}
```

**Manual Review Path (not found)**

```json
{
  "found": false,
  "route": "manual",
  "list_version": "v3",
  "message": "Your application will be reviewed by a QDB Relationship Manager. Expected: 5 business days.",
  "message_ar": "سيتم مراجعة طلبك من قبل مدير علاقات بنك قطر للتنمية. المدة المتوقعة: 5 أيام عمل."
}
```

---

## Document Endpoints

### POST /applications/:id/documents

Uploads a document for the specified application. Accepts multipart/form-data.

**Auth required**: Yes (own application)

**Request Body** (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | File content (max 10 MB) |
| `doc_type` | string | Yes | `salary_evidence`, `wps_file`, `rent_evidence`, `cr_copy`, `business_license` |

**Success Response — 201 Created**

```json
{
  "id": "doc-uuid-a1b2c3",
  "application_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "doc_type": "salary_evidence",
  "filename": "payroll_nov2025.pdf",
  "file_size_bytes": 245760,
  "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "virus_scan_status": "clean",
  "validated": true,
  "storage_path": "APP-2026-00501/salary_evidence/2026-03-03T10-55-00_payroll_nov2025.pdf",
  "uploaded_at": "2026-03-03T10:55:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_FILE_FORMAT` | File format not supported (must be PDF, JPEG, PNG, TIFF, or CSV for WPS) |
| 400 | `FILE_TOO_LARGE` | File exceeds 10 MB per-file limit |
| 400 | `TOTAL_SIZE_EXCEEDED` | Application total document size exceeds 50 MB |
| 422 | `VIRUS_DETECTED` | File failed virus scan — quarantined |

**curl Example**

```bash
curl -X POST http://localhost:5014/api/v1/applications/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@payroll_nov2025.pdf" \
  -F "doc_type=salary_evidence"
```

---

### GET /applications/:id/documents

Lists all documents uploaded for the specified application.

**Auth required**: Yes (own application or Admin)

**Success Response — 200 OK**

```json
{
  "documents": [
    {
      "id": "doc-uuid-a1b2c3",
      "doc_type": "salary_evidence",
      "filename": "payroll_nov2025.pdf",
      "file_size_bytes": 245760,
      "virus_scan_status": "clean",
      "validated": true,
      "uploaded_at": "2026-03-03T10:55:00Z"
    },
    {
      "id": "doc-uuid-b2c3d4",
      "doc_type": "wps_file",
      "filename": "wps_export_nov2025.csv",
      "file_size_bytes": 15360,
      "virus_scan_status": "clean",
      "validated": true,
      "uploaded_at": "2026-03-03T10:57:00Z"
    }
  ],
  "total_size_bytes": 261120,
  "required_docs_complete": false,
  "missing_doc_types": ["rent_evidence", "cr_copy"]
}
```

---

### POST /applications/:id/documents/wps/validate

Parses the uploaded WPS CSV file and cross-validates against the live WPS API. Returns validation
result including employee count, total salary, and any discrepancy.

**Auth required**: Yes (own application)

**Request Body**: None (validates the already-uploaded WPS file)

**Success Response — 200 OK (Validation Passed)**

```json
{
  "application_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pass",
  "data_source": "wps_api",
  "employee_count": 42,
  "total_salary_90d_qar": 1050000.00,
  "monthly_records": [
    {"month": "2025-12", "total_amount": 350000.00, "payment_date": "2025-12-28", "employees_paid": 42},
    {"month": "2026-01", "total_amount": 350000.00, "payment_date": "2026-01-27", "employees_paid": 42},
    {"month": "2026-02", "total_amount": 350000.00, "payment_date": "2026-02-26", "employees_paid": 42}
  ],
  "last_payroll_month": "2026-02",
  "declared_amount_qar": 1020000.00,
  "discrepancy_pct": 2.86,
  "discrepancy_within_threshold": true,
  "discrepancies": [],
  "validated_at": "2026-03-03T11:00:00Z"
}
```

**Success Response — 200 OK (Discrepancy Flagged)**

```json
{
  "status": "discrepancy_flag",
  "discrepancy_pct": 18.5,
  "discrepancy_within_threshold": false,
  "discrepancies": [
    {
      "field": "total_salary_90d_qar",
      "declared_value": 850000.00,
      "wps_api_value": 1040000.00,
      "difference": -190000.00,
      "percentage": -18.3
    }
  ],
  "warning": "Discrepancy exceeds 10% threshold. Case flagged for QDB manual review.",
  "warning_ar": "يتجاوز التباين حد 10%. تم تحديد الحالة للمراجعة اليدوية من بنك قطر للتنمية."
}
```

---

## CRM Endpoints

### POST /applications/:id/submit-to-crm

Creates a Dynamics CRM case for the application. Called automatically after eligibility and NRGP
check are complete. Returns the CRM Case ID.

**Auth required**: Yes (own application)

**Request Body**: None (uses existing application data)

**Success Response — 201 Created**

```json
{
  "application_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "crm_case_id": "CAS-2026-00412",
  "crm_case_guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "crm_case_type": "auto_nrgp",
  "crm_status": "pending_disbursement",
  "created_at": "2026-03-03T10:53:30Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 503 | `CRM_UNAVAILABLE` | CRM API timed out after 3 retries — application queued for retry |
| 409 | `CRM_CASE_EXISTS` | CRM case already created for this application |

---

## Admin Endpoints

All admin endpoints require a Bearer token with `role: "admin"` in the JWT payload.

### GET /admin/applications

Returns all applications with filter and pagination support.

**Auth required**: Admin

**Query Parameters**: Same as GET /applications (see above) — admin has access to all records.

**Additional Admin Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `crm_case_type` | string | Filter by CRM case type: `auto_nrgp`, `manual_review` |
| `wps_discrepancy` | boolean | Filter to WPS-flagged cases only |

**Success Response — 200 OK**: Same shape as GET /applications.

---

### POST /admin/nrgp-list/import

Uploads and activates a new NRGP beneficiary list from a CSV file. The existing list is deactivated
upon confirmation.

**Auth required**: Admin

**Request Body** (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | CSV file. One CR number per row. Header: `cr_number` |
| `program_cycle` | string | Yes | Cycle label (e.g., `"NRGP-2026-Q1"`) |
| `confirm_replace` | boolean | Yes | Must be `true` to replace the active list |

**Success Response — 201 Created**

```json
{
  "upload_id": "upload-uuid-xyz",
  "filename": "nrgp_list_mar2026.csv",
  "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "record_count": 3847,
  "program_cycle": "NRGP-2026-Q1",
  "preview": [
    {"cr_number": "1234567890"},
    {"cr_number": "0987654321"},
    {"cr_number": "1122334455"}
  ],
  "activated": true,
  "previous_list_deactivated": true,
  "activated_at": "2026-03-03T14:00:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_FILE_FORMAT` | File is not CSV or contains invalid columns |
| 400 | `INVALID_CR_FORMAT` | One or more CR numbers in the file are not 10-digit numeric |
| 400 | `EMPTY_FILE` | CSV file contains no records |

---

### GET /admin/nrgp-list

Returns the current active NRGP list metadata and optionally the full list.

**Auth required**: Admin

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include_records` | boolean | If true, includes all CR numbers in the response (may be large) |

**Success Response — 200 OK**

```json
{
  "active_list": {
    "upload_id": "upload-uuid-xyz",
    "filename": "nrgp_list_mar2026.csv",
    "program_cycle": "NRGP-2026-Q1",
    "record_count": 3847,
    "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "uploaded_by_qid": "28712345678",
    "activated_at": "2026-03-03T14:00:00Z"
  },
  "previous_lists": [
    {
      "upload_id": "upload-uuid-abc",
      "program_cycle": "NRGP-2025-Q4",
      "record_count": 3412,
      "activated_at": "2025-12-01T09:00:00Z",
      "deactivated_at": "2026-03-03T14:00:00Z"
    }
  ]
}
```

---

### PUT /admin/eligibility-criteria/:id

Updates a single eligibility criterion's parameters. Changes take effect immediately for all
subsequent evaluations.

**Auth required**: Admin

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Eligibility criteria record ID |

**Request Body**

```json
{
  "rule_parameters": {
    "min_months_registered": 12,
    "max_employees": 250
  },
  "description_en": "Updated rule description",
  "description_ar": "وصف القاعدة المحدثة",
  "active": true
}
```

**Success Response — 200 OK**

```json
{
  "id": "criteria-uuid-001",
  "code": "EC-002",
  "name": "Company registration age",
  "rule_parameters": {
    "min_months_registered": 12,
    "max_employees": 250
  },
  "active": true,
  "modified_by_qid": "28700000001",
  "effective_from": "2026-03-03T14:30:00Z",
  "modified_at": "2026-03-03T14:30:00Z"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 403 | `MANDATORY_CRITERION` | EC-001, EC-002, EC-004 cannot be disabled or deleted |
| 404 | `CRITERION_NOT_FOUND` | Criterion ID not found |

---

### GET /admin/dashboard-stats

Returns KPI summary statistics for the admin dashboard.

**Auth required**: Admin

**Success Response — 200 OK**

```json
{
  "total_applications": 1247,
  "by_status": {
    "draft": 45,
    "submitted": 312,
    "under_review": 247,
    "approved": 0,
    "rejected": 145,
    "disbursed": 498
  },
  "by_route": {
    "auto": 892,
    "manual": 355
  },
  "avg_processing_time_hours": {
    "auto_path": 3.2,
    "manual_path": 28.7
  },
  "document_resubmission_rate_pct": 8.3,
  "wps_discrepancy_rate_pct": 12.1,
  "nas_auth_success_rate_pct": 98.7,
  "crm_case_creation_failure_rate_pct": 0.08,
  "report_generated_at": "2026-03-03T14:00:00Z"
}
```

---

## Status Codes Reference

| Code | Meaning |
|------|---------|
| 200 | OK — Successful GET or PATCH |
| 201 | Created — Successful POST that created a resource |
| 400 | Bad Request — Invalid input data or format |
| 401 | Unauthorized — Missing or expired session token |
| 403 | Forbidden — Valid token but insufficient permissions |
| 404 | Not Found — Resource does not exist |
| 409 | Conflict — Duplicate application or resource already exists |
| 422 | Unprocessable Entity — Business rule violation |
| 500 | Internal Server Error — Unhandled server error |
| 503 | Service Unavailable — External dependency (NAS, MOCI, WPS, CRM) is down |

---

*This API specification is a confidential internal document — QDB Internal Use Only.*
