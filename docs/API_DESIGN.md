# REST API Design
## Radiology Uber (Working Title)

**Document version:** 0.1 (Draft for founding-team review)
**Date:** 2026-07-28
**Companion documents:** `docs/SRS.md`, `docs/PRD.md`, `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/UX_DESIGN.md`
**Scope note:** This is an API contract design — every endpoint, its method, auth requirement, request/response shape, and error behavior. No server implementation, no framework/route code. Endpoint paths, field names, and status codes are specified precisely enough to build against, but nothing here is executable.

---

## 0. Conventions (read this before any endpoint below)

Stated once so 100+ endpoint entries don't each repeat the same boilerplate.

### 0.1 Base URL & versioning
```
https://api.radiologyuber.com/v1
```
All endpoints below are relative to this base and implicitly prefixed `/v1`. Versioning is in the URL path (not headers) — simplest to reason about and cache correctly; a breaking change ships as `/v2` with `/v1` kept alive on a published deprecation timeline, never mutated in place.

### 0.2 Authentication
Bearer JWT in the `Authorization` header for every endpoint except those explicitly tagged **Public** or **Webhook**:
```
Authorization: Bearer <access_token>
```
Each endpoint below is tagged with one of these auth levels (mechanics defined in `docs/ARCHITECTURE.md` §6):

| Tag | Meaning |
|---|---|
| **Public** | No token required. |
| **Authenticated** | Any logged-in user, any role. |
| **Patient** | Authenticated user with the `patient` role. |
| **Doctor** | Authenticated user with the `doctor` role. |
| **Radiologist** | Authenticated user with the `radiologist` role — endpoints that let them *act* on a case additionally require a **live** `verification_status = 'verified'` check (re-checked per request, not trusted from the JWT — `docs/ARCHITECTURE.md` §6.3), marked "(verified)" below. |
| **Radiographer** | Same pattern as Radiologist. |
| **Facility Staff** | Authenticated user with an active `facility_staff` row for the `facility_id` in the request path; specific `staff_role` restrictions noted per endpoint (e.g., payouts are center-admin-only, not front-desk). |
| **Admin** | Authenticated user with `platform_admin` or `finance_admin` role; specific department restrictions noted where relevant. |
| **Webhook** | No JWT — authenticated instead by provider signature verification (`docs/ARCHITECTURE.md` §9.3). |

### 0.3 Response envelope
**Single-resource responses** return the resource directly as the JSON body — no wrapper:
```json
{ "id": "b7e1...", "status": "confirmed", "...": "..." }
```
**List responses** are wrapped with pagination metadata:
```json
{
  "data": [ { "...": "..." }, { "...": "..." } ],
  "meta": { "page": 1, "page_size": 20, "total_count": 143, "total_pages": 8 }
}
```
Pagination is page-based (`?page=1&page_size=20`, default 20, max 100) everywhere **except** `GET /admin/audit-logs`, which uses cursor pagination (`?cursor=...`) — a deliberate exception, because that table is high-volume and append-only (`docs/DATABASE_DESIGN.md` §9.2), where offset-based paging degrades badly at depth and a cursor is both cheaper and more correct for a continuously-growing dataset.

### 0.4 Error format
Every non-2xx response uses the same shape:
```json
{
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "This slot is no longer available. Please choose another time.",
    "details": {}
  }
}
```
`code` is a stable, machine-readable string clients can branch on; `message` is safe to show a user as-is (plain language, no stack traces or internal identifiers ever appear here); `details` carries structured, endpoint-specific context (e.g., field-level validation errors). A consolidated error-code reference is in §12.

### 0.5 HTTP status codes used
| Code | Meaning here |
|---|---|
| 200 | Success (read, update, or action with a response body) |
| 201 | Resource created |
| 202 | Accepted — processing continues asynchronously (e.g., a payment awaiting MoMo approval) |
| 204 | Success, no response body (deletions, some actions) |
| 400 | Malformed request (bad JSON, missing required field) |
| 401 | Missing/invalid/expired auth token |
| 403 | Authenticated, but not authorized for this resource/action (wrong role, wrong facility, unverified credential) |
| 404 | Resource not found (or exists but the caller isn't authorized to know that — see §0.6) |
| 409 | Conflict — the request is well-formed but can't be satisfied given current state (slot just taken, report already signed) |
| 422 | Semantically invalid request (fails a business rule, e.g., booking a slot in the past) |
| 429 | Rate limited |
| 500 / 503 | Server error / temporarily unavailable |

### 0.6 A deliberate security note on 404 vs. 403
Where returning `403` would confirm to an unauthorized caller that a resource *exists* (e.g., a patient probing another patient's booking ID), the API returns `404` instead — indistinguishable from "doesn't exist." Where the caller's authorization to *know about* the resource's existence isn't itself sensitive (e.g., a facility staff member hitting a route outside their assigned facility), `403` is used, since it's more useful for legitimate debugging and reveals nothing sensitive. This distinction is applied consistently, not ad hoc, and is called out once here rather than repeated per endpoint.

### 0.7 Idempotency
Mutating endpoints that create a financial or otherwise hard-to-undo record accept an optional `Idempotency-Key` header (a client-generated UUID). Replaying the same request with the same key returns the original result rather than creating a duplicate — required specifically for `POST /bookings`, `POST /bookings/{id}/payments`, and `POST /reports/{id}/submit`, where a retried request after a dropped connection must never double-book, double-charge, or double-submit.

### 0.8 Rate limiting
Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. OTP-request endpoints carry a materially stricter limit than general traffic, applied per phone number *and* per IP, since SMS cost and abuse potential are real concerns there specifically (`docs/ARCHITECTURE.md` §6.1).

---

## 1. Endpoint Index

Every endpoint, grouped by domain, for quick reference. Full detail for each follows in §2–§10.

### Authentication
| Method | Path | Auth |
|---|---|---|
| POST | `/auth/otp/request` | Public |
| POST | `/auth/otp/verify` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/mfa/verify` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Authenticated |
| POST | `/auth/password/forgot` | Public |
| POST | `/auth/password/reset` | Public |

### Identity & Profiles
| Method | Path | Auth |
|---|---|---|
| GET | `/users/me` | Authenticated |
| PATCH | `/users/me` | Authenticated |
| GET | `/users/me/dependents` | Patient |
| POST | `/users/me/dependents` | Patient |
| PATCH | `/users/me/dependents/{id}` | Patient |
| DELETE | `/users/me/dependents/{id}` | Patient |
| GET | `/doctors/profile` | Doctor |
| POST | `/doctors/profile` | Authenticated |
| PATCH | `/doctors/profile` | Doctor |
| GET | `/radiologists/profile` | Radiologist |
| POST | `/radiologists/profile` | Authenticated |
| PATCH | `/radiologists/profile` | Radiologist |
| GET | `/radiographers/profile` | Radiographer |
| POST | `/radiographers/profile` | Authenticated |
| PATCH | `/radiographers/profile` | Radiographer |
| GET | `/credential-documents` | Doctor/Radiologist/Radiographer |
| POST | `/credential-documents` | Doctor/Radiologist/Radiographer |
| GET | `/consent-records` | Patient |
| POST | `/consent-records` | Patient |

### Facilities & Services
| Method | Path | Auth |
|---|---|---|
| GET | `/modalities` | Public |
| GET | `/facilities` | Public |
| GET | `/facilities/{id}` | Public |
| POST | `/facilities` | Authenticated |
| PATCH | `/facilities/{id}` | Facility Staff (center_admin/hospital_admin) |
| GET | `/facilities/{id}/services` | Public |
| POST | `/facilities/{id}/services` | Facility Staff (admin) |
| PATCH | `/facilities/{id}/services/{serviceId}` | Facility Staff (admin) |
| DELETE | `/facilities/{id}/services/{serviceId}` | Facility Staff (admin) |
| GET | `/facilities/{id}/services/{serviceId}/slots` | Public |
| POST | `/facilities/{id}/services/{serviceId}/slots` | Facility Staff (admin) |
| PATCH | `/facilities/{id}/slots/{slotId}` | Facility Staff (admin/front_desk) |
| GET | `/facilities/{id}/equipment` | Facility Staff |
| POST | `/facilities/{id}/equipment` | Facility Staff (admin) |
| PATCH | `/facilities/{id}/equipment/{equipmentId}` | Facility Staff (admin/front_desk) |
| GET | `/facilities/{id}/staff` | Facility Staff (admin) |
| POST | `/facilities/{id}/staff` | Facility Staff (admin) |
| PATCH | `/facilities/{id}/staff/{staffId}` | Facility Staff (admin) |
| DELETE | `/facilities/{id}/staff/{staffId}` | Facility Staff (admin) |

### Referrals & Bookings
| Method | Path | Auth |
|---|---|---|
| POST | `/referrals` | Doctor |
| GET | `/referrals` | Doctor/Patient |
| GET | `/referrals/{id}` | Doctor/Patient |
| PATCH | `/referrals/{id}` | Doctor |
| POST | `/bookings` | Patient |
| GET | `/bookings` | Patient/Facility Staff/Admin |
| GET | `/bookings/{id}` | Patient/Facility Staff/Admin |
| POST | `/bookings/{id}/cancel` | Patient/Facility Staff |
| POST | `/bookings/{id}/reschedule` | Patient |
| POST | `/bookings/{id}/check-in` | Facility Staff |
| POST | `/bookings/{id}/start` | Facility Staff (radiographer) |
| POST | `/bookings/{id}/images-acquired` | Facility Staff (radiographer) |
| GET | `/bookings/{id}/history` | Patient/Facility Staff/Admin |

### Imaging & Reporting
| Method | Path | Auth |
|---|---|---|
| GET | `/bookings/{id}/studies` | Patient/Facility Staff/Radiologist |
| POST | `/bookings/{id}/studies` | Facility Staff (radiographer) |
| GET | `/studies/{id}` | Patient/Facility Staff/Radiologist |
| POST | `/studies/{id}/reports` | Radiologist (verified) |
| GET | `/reports/{id}` | Patient/Doctor/Facility Staff/Radiologist |
| PATCH | `/reports/{id}` | Radiologist (verified, own draft) |
| POST | `/reports/{id}/submit` | Radiologist (verified, own draft) |
| POST | `/reports/{id}/addenda` | Radiologist (verified) |
| GET | `/reports/{id}/addenda` | Patient/Doctor/Facility Staff |
| GET | `/patients/{id}/imaging-history` | Patient/Doctor (consent-gated) |

### Marketplace Matching
| Method | Path | Auth |
|---|---|---|
| POST | `/match-requests` | Facility Staff |
| GET | `/match-requests` | Facility Staff/Radiologist/Radiographer |
| GET | `/match-requests/{id}` | Facility Staff/Radiologist/Radiographer |
| PATCH | `/match-requests/{id}` | Facility Staff |
| GET | `/match-offers` | Radiologist/Radiographer |
| POST | `/match-offers/{id}/accept` | Radiologist/Radiographer (verified) |
| POST | `/match-offers/{id}/decline` | Radiologist/Radiographer |

### Payments & Payouts
| Method | Path | Auth |
|---|---|---|
| POST | `/bookings/{id}/payments` | Patient |
| GET | `/payments/{id}` | Patient/Admin |
| POST | `/payments/{id}/refund` | Admin (finance) |
| GET | `/payouts` | Facility Staff (admin)/Radiologist/Radiographer/Admin |
| GET | `/payouts/{id}` | Facility Staff (admin)/Radiologist/Radiographer/Admin |
| GET | `/payouts/{id}/line-items` | Facility Staff (admin)/Radiologist/Radiographer/Admin |
| POST | `/webhooks/payments/{provider}` | Webhook |

### Trust & Disputes
| Method | Path | Auth |
|---|---|---|
| POST | `/bookings/{id}/rating` | Patient |
| GET | `/facilities/{id}/ratings` | Public |
| POST | `/disputes` | Authenticated |
| GET | `/disputes` | Authenticated/Admin |
| GET | `/disputes/{id}` | Authenticated (own)/Admin |
| POST | `/disputes/{id}/events` | Authenticated (own)/Admin |
| PATCH | `/disputes/{id}` | Admin |

### Notifications & Devices
| Method | Path | Auth |
|---|---|---|
| POST | `/devices` | Authenticated |
| DELETE | `/devices/{id}` | Authenticated |
| GET | `/notifications` | Authenticated |
| PATCH | `/notifications/{id}/read` | Authenticated |
| PATCH | `/users/me/notification-preferences` | Authenticated |

### Admin & Ops
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/dashboard/metrics` | Admin |
| GET | `/admin/credential-documents` | Admin (ops) |
| POST | `/admin/credential-documents/{id}/approve` | Admin (ops) |
| POST | `/admin/credential-documents/{id}/reject` | Admin (ops) |
| GET | `/admin/facilities` | Admin (ops) |
| POST | `/admin/facilities/{id}/verify` | Admin (ops) |
| POST | `/admin/bookings/{id}/override` | Admin (ops) |
| GET | `/admin/match-requests/monitor` | Admin (ops) |
| GET | `/admin/audit-logs` | Admin (ops) |
| GET | `/admin/users/{id}` | Admin |
| POST | `/admin/users/{id}/suspend` | Admin |
| POST | `/admin/users/{id}/reactivate` | Admin |
| GET | `/admin/feature-flags` | Admin |
| PATCH | `/admin/feature-flags/{key}` | Admin |

**Total: 76 endpoints.**

---

## 2. Authentication

### `POST /auth/otp/request`
**Purpose:** Request an SMS OTP for patient login/registration (SRS FR-ID-02).
**Auth:** Public (rate-limited per phone number and IP — §0.8).
**Request body:**
```json
{ "phone_number": "+233241234567" }
```
**Response `202 Accepted`:**
```json
{ "message": "Code sent", "retry_after_seconds": 45 }
```
**Errors:** `400 INVALID_PHONE_FORMAT` · `429 RATE_LIMITED`
**Example:**
```
POST /v1/auth/otp/request
{ "phone_number": "+233241234567" }

202 Accepted
{ "message": "Code sent", "retry_after_seconds": 45 }
```

### `POST /auth/otp/verify`
**Purpose:** Verify the OTP and receive tokens; creates a new `users` row if the phone number is unrecognized (SRS FR-ID-02).
**Auth:** Public.
**Request body:**
```json
{ "phone_number": "+233241234567", "code": "482913", "full_name": "Ama Owusu" }
```
`full_name` is required only on first-time registration; omitted for a returning user.
**Response `200 OK`:**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "8f3e2c1a...",
  "expires_in": 900,
  "user": { "id": "3f9a...", "full_name": "Ama Owusu", "roles": ["patient"], "is_new_user": false }
}
```
**Errors:** `400 OTP_INVALID` · `410 OTP_EXPIRED` · `422 FULL_NAME_REQUIRED` (new user, name missing)
**Example:**
```
POST /v1/auth/otp/verify
{ "phone_number": "+233241234567", "code": "482913" }

200 OK
{ "access_token": "eyJ...", "refresh_token": "8f3e...", "expires_in": 900,
  "user": { "id": "3f9a...", "full_name": "Ama Owusu", "roles": ["patient"], "is_new_user": false } }
```

### `POST /auth/login`
**Purpose:** Step 1 of practitioner/admin login — password check, triggers an MFA code send (`docs/ARCHITECTURE.md` §6.2).
**Auth:** Public.
**Request body:** `{ "email_or_phone": "dr.boateng@example.com", "password": "..." }`
**Response `202 Accepted`:** `{ "mfa_challenge_id": "mfa_7a2b...", "message": "Code sent to your phone" }`
**Errors:** `401 INVALID_CREDENTIALS` · `403 ACCOUNT_SUSPENDED` · `429 RATE_LIMITED`

### `POST /auth/mfa/verify`
**Purpose:** Step 2 — verify the MFA code and issue tokens.
**Auth:** Public (scoped to a valid `mfa_challenge_id`).
**Request body:** `{ "mfa_challenge_id": "mfa_7a2b...", "code": "119402" }`
**Response `200 OK`:** same token shape as `/auth/otp/verify`, `roles` reflecting this account's actual roles (e.g., `["radiologist"]`).
**Errors:** `400 MFA_CODE_INVALID` · `410 MFA_CHALLENGE_EXPIRED`

### `POST /auth/refresh`
**Purpose:** Exchange a valid refresh token for a new access token (`docs/ARCHITECTURE.md` §6.4).
**Auth:** Public (bearer is the refresh token itself, not an access token).
**Request body:** `{ "refresh_token": "8f3e2c1a..." }`
**Response `200 OK`:** `{ "access_token": "eyJ...", "expires_in": 900 }`
**Errors:** `401 REFRESH_TOKEN_INVALID_OR_REVOKED`

### `POST /auth/logout`
**Purpose:** Revoke the current refresh token (server-side, since refresh tokens are stateful — `docs/ARCHITECTURE.md` §6.4).
**Auth:** Authenticated.
**Request body:** `{ "refresh_token": "8f3e2c1a..." }`
**Response:** `204 No Content`
**Errors:** `401 UNAUTHORIZED`

### `POST /auth/password/forgot` / `POST /auth/password/reset`
**Purpose:** Practitioner/admin password recovery flow.
**Auth:** Public.
**Request (`forgot`):** `{ "email": "dr.boateng@example.com" }` → `202 Accepted` (always, regardless of whether the email exists — prevents account enumeration).
**Request (`reset`):** `{ "reset_token": "...", "new_password": "..." }` → `204 No Content`.
**Errors (`reset`):** `400 RESET_TOKEN_INVALID_OR_EXPIRED` · `422 PASSWORD_POLICY_VIOLATION`

---

## 3. Identity & Profiles

### `GET /users/me`
**Purpose:** Fetch the caller's own aggregated identity — base user record plus whichever role-specific profiles exist (SRS §2.2's multi-role model, `docs/DATABASE_DESIGN.md` §2.1–2.2).
**Auth:** Authenticated.
**Response `200 OK`:**
```json
{
  "id": "3f9a...",
  "phone_number": "+233241234567",
  "email": null,
  "full_name": "Ama Owusu",
  "preferred_language": "en",
  "account_status": "active",
  "roles": ["patient"],
  "patient_profile": { "date_of_birth": "1991-04-12", "gender": "female" }
}
```
**Errors:** `401 UNAUTHORIZED`

### `PATCH /users/me`
**Purpose:** Update base profile fields (name, email, language).
**Auth:** Authenticated.
**Request body (any subset):** `{ "email": "ama@example.com", "preferred_language": "tw" }`
**Response `200 OK`:** the updated `users/me` shape.
**Errors:** `422 EMAIL_ALREADY_IN_USE` · `422 INVALID_LANGUAGE_CODE`

### `GET /users/me/dependents` / `POST /users/me/dependents`
**Purpose:** Manage the family-booking model (`docs/DATABASE_DESIGN.md` §2.4, UX_DESIGN A4 step 1).
**Auth:** Patient.
**POST request body:** `{ "full_name": "Akosua Owusu", "date_of_birth": "1962-01-30", "gender": "female", "relationship": "parent" }`
**Response `201 Created`:** `{ "id": "d4c1...", "full_name": "Akosua Owusu", "date_of_birth": "1962-01-30", "gender": "female", "relationship": "parent" }`
**Errors:** `422 INVALID_DATE_OF_BIRTH`

### `PATCH /users/me/dependents/{id}` / `DELETE /users/me/dependents/{id}`
**Purpose:** Edit or remove a dependent.
**Auth:** Patient (must be the dependent's `guardian_user_id`).
**DELETE response:** `204 No Content`. **Note:** if the dependent has any non-cancelled bookings, `DELETE` returns `409 DEPENDENT_HAS_ACTIVE_BOOKINGS` rather than silently orphaning booking history — consistent with the no-hard-delete-of-clinical-history principle (`docs/DATABASE_DESIGN.md` §11.2); the application should offer archiving instead in that case.
**Errors:** `403 NOT_YOUR_DEPENDENT` · `404 DEPENDENT_NOT_FOUND` · `409 DEPENDENT_HAS_ACTIVE_BOOKINGS`

### `GET/POST/PATCH /doctors/profile`, `/radiologists/profile`, `/radiographers/profile`
**Purpose:** Create and manage the three practitioner profile types (`docs/DATABASE_DESIGN.md` §2.5–2.9).
**Auth:** `POST` is **Authenticated** (any logged-in user completing onboarding into a new role); `GET`/`PATCH` require the corresponding role.
**POST `/radiologists/profile` request body:**
```json
{ "mdc_license_no": "MDC-RAD-4471", "years_experience": 9, "subspecialties": ["neuro", "musculoskeletal"] }
```
**Response `201 Created`:**
```json
{
  "user_id": "8b2f...", "mdc_license_no": "MDC-RAD-4471", "years_experience": 9,
  "verification_status": "pending", "availability_status": "offline", "subspecialties": ["neuro", "musculoskeletal"]
}
```
**PATCH `/radiologists/profile` request body (availability toggle, UX_DESIGN C2):** `{ "availability_status": "online" }`
**Errors:** `409 LICENSE_NUMBER_ALREADY_REGISTERED` · `403 PROFILE_NOT_YET_VERIFIED` (returned on `PATCH availability_status` if `verification_status != 'verified'` — a pending or rejected practitioner cannot go "online" and be offered cases, enforcing FR-ID-03 at the API layer, not just in the UI)

### `GET /credential-documents` / `POST /credential-documents`
**Purpose:** Upload and track credentialing documents (`docs/DATABASE_DESIGN.md` §2.10, FR-ID-03/04).
**Auth:** Doctor/Radiologist/Radiographer (own documents only).
**POST request body:** `{ "document_type": "license_certificate", "file_url": "https://storage.radiologyuber.com/uploads/..." }` — the file itself is uploaded directly to object storage via a pre-signed URL obtained separately; this endpoint only records the reference (`docs/ARCHITECTURE.md` §7.3).
**Response `201 Created`:** `{ "id": "cd_91a2...", "document_type": "license_certificate", "review_status": "pending", "uploaded_at": "2026-07-28T09:12:00Z" }`
**GET response:** a list including `review_status`, `reviewed_at`, and `rejection_reason` where applicable — matching the per-document status visibility required in UX_DESIGN B6/C7.
**Errors:** `422 INVALID_DOCUMENT_TYPE` · `422 FILE_URL_NOT_ACCESSIBLE`

### `GET /consent-records` / `POST /consent-records`
**Purpose:** The patient-facing consent ledger (`docs/DATABASE_DESIGN.md` §9.1, SRS §5.5, UX_DESIGN A8).
**Auth:** Patient.
**POST request body:** `{ "consent_type": "data_sharing", "granted": true, "shared_with_doctor_user_id": "7c1e...", "dependent_id": null }`
**Response `201 Created`:** the created consent record, including `consented_at`.
**Revocation** is a new `POST` with `"granted": false` for the same `consent_type` (append-only history, per §11.2 of the DB design — never an `UPDATE`/`DELETE` on a past consent record).
**Errors:** `422 INVALID_CONSENT_TYPE` · `403 CANNOT_CONSENT_FOR_UNLINKED_DEPENDENT`

---

## 4. Facilities & Services

### `GET /modalities`
**Purpose:** Public reference lookup (`docs/DATABASE_DESIGN.md` §3.1) — populates modality filter chips (UX_DESIGN A3).
**Auth:** Public.
**Response `200 OK`:** `{ "data": [ { "id": "mod_ct", "code": "CT", "display_name": "CT Scan", "typical_duration_minutes": 30 }, "..." ] }`

### `GET /facilities`
**Purpose:** The core patient search endpoint (FR-DISC-01–04, UX_DESIGN A3).
**Auth:** Public.
**Query params:** `lat`, `lng`, `radius_km`, `modality`, `min_price`, `max_price`, `available_from`, `sort` (`distance` \| `price` \| `soonest` \| `rating`), `page`, `page_size`.
**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "fac_1a2b...", "name": "East Legon Diagnostic Centre", "verification_status": "verified",
      "distance_km": 2.4, "rating_average": 4.6, "rating_count": 128,
      "services": [ { "id": "svc_9f...", "modality": "ultrasound", "name": "Abdominal Ultrasound",
                      "price_ghs": 180.00, "next_available_slot": "2026-07-29T10:00:00Z" } ]
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total_count": 34, "total_pages": 2 }
}
```
**Errors:** `400 INVALID_COORDINATES`
**Design note:** result rows include `verification_status`, `price_ghs`, and `next_available_slot` inline — never requiring a second call per result — directly implementing UX_DESIGN A3's requirement that trust and price signals appear on the result card itself.

### `GET /facilities/{id}`
**Purpose:** Facility detail page.
**Auth:** Public.
**Response `200 OK`:** full facility record (name, address, phone, verification status, all active services) plus an aggregated `rating_average`/`rating_count`.
**Errors:** `404 FACILITY_NOT_FOUND`

### `POST /facilities`
**Purpose:** Facility onboarding (SRS FR-ID-05).
**Auth:** Authenticated (the creator becomes the facility's first `center_admin`/`hospital_admin` staff row).
**Request body:**
```json
{ "name": "East Legon Diagnostic Centre", "facility_type": "imaging_center",
  "address_line": "12 Lagos Ave", "city": "Accra", "region": "Greater Accra",
  "phone_number": "+233302123456", "ghs_license_no": "GHS-2024-8817" }
```
**Response `201 Created`:** the facility record with `verification_status: "pending"` — not bookable until an Admin verifies it (see §10).
**Errors:** `422 MISSING_REQUIRED_FIELD` · `409 DUPLICATE_LICENSE_NUMBER`

### `PATCH /facilities/{id}`
**Purpose:** Update facility profile (address, phone, `has_onsite_radiologist` flag — UX_DESIGN D9).
**Auth:** Facility Staff (`center_admin`/`hospital_admin` only — front-desk cannot edit facility settings, per FR-ID-07's RBAC requirement).
**Request body (any subset):** `{ "has_onsite_radiologist": false }`
**Errors:** `403 INSUFFICIENT_STAFF_ROLE`

### Services: `GET/POST /facilities/{id}/services`, `PATCH/DELETE /facilities/{id}/services/{serviceId}`
**Purpose:** Manage the bookable catalog (`docs/DATABASE_DESIGN.md` §3.5, UX_DESIGN D6).
**Auth:** `GET` Public; `POST`/`PATCH`/`DELETE` Facility Staff (admin).
**POST request body:** `{ "modality_id": "mod_us", "name": "Abdominal Ultrasound", "price_ghs": 180.00, "duration_minutes": 30, "pre_appointment_instructions": "Drink 1L of water 1 hour before arrival." }`
**Response `201 Created`:** the created service.
**DELETE** is a soft deactivation (`is_active = false`, not a row delete) — response `200 OK` with the updated `{ "is_active": false }` service, not `204`, since the record persists for historical booking references (`docs/DATABASE_DESIGN.md` §11.2).
**Errors:** `422 PRICE_MUST_BE_NON_NEGATIVE` · `404 MODALITY_NOT_FOUND`

### Slots: `GET/POST /facilities/{id}/services/{serviceId}/slots`, `PATCH /facilities/{id}/slots/{slotId}`
**Purpose:** The real-time calendar (FR-DISC-04, UX_DESIGN D3).
**Auth:** `GET` Public (query `?from=&to=` for a date range); `POST`/`PATCH` Facility Staff.
**POST request body (bulk-create supported):**
```json
{ "equipment_id": "eq_mri1", "slots": [
  { "start_time": "2026-07-29T09:00:00Z", "end_time": "2026-07-29T09:30:00Z", "capacity": 1 },
  { "start_time": "2026-07-29T09:30:00Z", "end_time": "2026-07-29T10:00:00Z", "capacity": 1 } ] }
```
**Response `201 Created`:** `{ "created_count": 2, "slot_ids": ["slot_a1...", "slot_a2..."] }`
**PATCH request body (block a slot, UX_DESIGN D3):** `{ "is_blocked": true, "reason": "Machine maintenance" }`
**Errors:** `409 OVERLAPPING_SLOT_DEFINITION` (matches the `UNIQUE(facility_service_id, equipment_id, start_time)` constraint) · `422 END_TIME_BEFORE_START_TIME`

### Equipment: `GET/POST /facilities/{id}/equipment`, `PATCH /facilities/{id}/equipment/{equipmentId}`
**Purpose:** Represent individual machines (`docs/DATABASE_DESIGN.md` §3.4, UX_DESIGN D3's "one of two MRIs is down" scenario).
**Auth:** `GET` Facility Staff; `POST` admin; `PATCH` admin/front_desk (front-desk can flag a machine down, not add new equipment — a deliberately narrower grant).
**PATCH request body:** `{ "is_operational": false }` — immediately removes this machine's future slots from patient-facing search (enforced server-side in the `GET /facilities` query, not left to the client to filter).
**Errors:** `403 INSUFFICIENT_STAFF_ROLE`

### Staff: `GET/POST /facilities/{id}/staff`, `PATCH/DELETE /facilities/{id}/staff/{staffId}`
**Purpose:** Manage `facility_staff` rows (`docs/DATABASE_DESIGN.md` §3.3, UX_DESIGN D7).
**Auth:** Facility Staff (admin only).
**POST request body:** `{ "phone_number": "+233201112233", "staff_role": "front_desk", "employment_type": "employee" }` — if the phone number has no existing `users` account, an invitation SMS is sent; the staff row is created in a pending-invite state until claimed.
**Response `201 Created`:** the staff record.
**DELETE** sets `is_active = false` (not a row delete, consistent with §11.2 principle applied throughout).
**Errors:** `422 INVALID_STAFF_ROLE` · `409 ALREADY_STAFF_AT_THIS_FACILITY`

---

## 5. Referrals & Bookings

### `POST /referrals`
**Purpose:** Doctor-initiated referral (FR-BOOK-02, FR-DISC-05, UX_DESIGN A4).
**Auth:** Doctor.
**Request body:**
```json
{ "patient_user_id": "3f9a...", "dependent_id": null, "modality_id": "mod_us",
  "clinical_notes": "R/O gallstones", "is_urgent": false, "preferred_facility_id": "fac_1a2b..." }
```
**Response `201 Created`:** the referral record, `status: "pending"`, plus a shareable link/code the doctor can send the patient.
**Errors:** `422 EXACTLY_ONE_BENEFICIARY_REQUIRED` (mirrors the DB `CHECK (num_nonnulls(...) = 1)` constraint, `docs/DATABASE_DESIGN.md` §4.1) · `404 PATIENT_NOT_FOUND`

### `GET /referrals` / `GET /referrals/{id}`
**Purpose:** List/view referrals — a doctor sees referrals they created; a patient sees referrals naming them or a dependent.
**Auth:** Doctor/Patient (scoped to own records; `404` for anyone else's, per §0.6).

### `PATCH /referrals/{id}`
**Purpose:** Cancel or expire a referral before it converts to a booking.
**Auth:** Doctor (own referral only).
**Request body:** `{ "status": "cancelled" }`
**Errors:** `409 REFERRAL_ALREADY_BOOKED` (cannot cancel a referral that already produced a booking)

### `POST /bookings`
**Purpose:** The central transaction (FR-BOOK-01, UX_DESIGN A4). Idempotency-Key supported (§0.7).
**Auth:** Patient.
**Request body:**
```json
{
  "facility_service_id": "svc_9f...", "slot_id": "slot_a1...",
  "beneficiary_dependent_id": null, "referral_id": null
}
```
**Response `201 Created`:**
```json
{
  "id": "bk_5e21...", "booking_reference": "RU-2026-88213", "status": "requested",
  "facility_service_id": "svc_9f...", "slot_id": "slot_a1...",
  "price_ghs": 180.00, "platform_fee_ghs": 9.00,
  "beneficiary": { "type": "self", "user_id": "3f9a..." },
  "created_at": "2026-07-28T09:20:11Z"
}
```
**Errors:** `409 SLOT_NO_LONGER_AVAILABLE` (the concurrency case from `docs/ARCHITECTURE.md` §5.5 — client should re-fetch slots and retry, per UX_DESIGN A4's designed non-blaming re-prompt) · `422 DEPENDENT_NOT_OWNED_BY_CALLER` · `404 SERVICE_NOT_FOUND`

### `GET /bookings`
**Purpose:** List bookings — scoped by role: a patient sees their own (and dependents'); facility staff see their facility's queue (UX_DESIGN D4); admin can query across all (§10).
**Auth:** Patient/Facility Staff/Admin.
**Query params:** `status`, `facility_id` (facility staff/admin only), `from`, `to`, `page`, `page_size`.
**Response:** standard paginated list envelope.

### `GET /bookings/{id}`
**Purpose:** Booking detail (backs UX_DESIGN A6 Tracking).
**Auth:** Patient (own)/Facility Staff (own facility)/Admin.
**Response `200 OK`:** full booking record including current `status`, key lifecycle timestamps (`checked_in_at`, `images_acquired_at`, `completed_at`), and embedded facility/service summary.
**Errors:** `404` (per §0.6, for both nonexistent and unauthorized-to-view bookings)

### `POST /bookings/{id}/cancel`
**Purpose:** FR-BOOK-04's cancellation flow.
**Auth:** Patient (own booking)/Facility Staff.
**Request body:** `{ "reason": "Schedule conflict" }`
**Response `200 OK`:** updated booking with `status: "cancelled"`, `cancellation_reason`, `cancelled_at`. If a refund is owed per the cancellation policy, a `refund` object summary is included in the response.
**Errors:** `409 BOOKING_NOT_CANCELLABLE` (already checked in or completed)

### `POST /bookings/{id}/reschedule`
**Purpose:** FR-BOOK-04.
**Auth:** Patient (own booking).
**Request body:** `{ "new_slot_id": "slot_b7..." }`
**Response `200 OK`:** the booking with its `slot_id` updated (old slot released, same concurrency handling as booking creation).
**Errors:** `409 SLOT_NO_LONGER_AVAILABLE` · `409 BOOKING_NOT_RESCHEDULABLE`

### `POST /bookings/{id}/check-in`
**Purpose:** Front-desk action (FR-IMG-01, UX_DESIGN D4).
**Auth:** Facility Staff.
**Response `200 OK`:** booking with `status: "checked_in"`, `checked_in_at` set. Emits a `booking.checked_in` event (`docs/ARCHITECTURE.md` §5.4) that the patient's app picks up on Tracking.
**Errors:** `409 INVALID_STATUS_TRANSITION` (e.g., already checked in, or cancelled)

### `POST /bookings/{id}/start` / `POST /bookings/{id}/images-acquired`
**Purpose:** Radiographer's sequential workflow actions (FR-IMG-01, UX_DESIGN B4's single-action-at-a-time screen).
**Auth:** Facility Staff (radiographer).
**Response `200 OK`:** booking with `status` advanced to `in_progress` / `images_acquired` respectively.
**Design note:** these are separate, purpose-named endpoints rather than one generic `PATCH /bookings/{id} { "status": "..." }` — a deliberate choice: each represents a distinct real-world action with its own validity rules and side effects (e.g., `images-acquired` is what makes the booking eligible for study creation, §6), and named action endpoints are self-documenting and harder to misuse than a generic status-setter that would let a client attempt an invalid jump (e.g., `requested → images_acquired` directly).
**Errors:** `409 INVALID_STATUS_TRANSITION`

### `GET /bookings/{id}/history`
**Purpose:** The full `booking_status_history` audit trail (UX_DESIGN F4).
**Auth:** Patient (own)/Facility Staff/Admin.
**Response `200 OK`:** `{ "data": [ { "from_status": "confirmed", "to_status": "checked_in", "changed_by": "staff_...", "created_at": "..." }, "..." ] }`

---

## 6. Imaging & Reporting

### `GET/POST /bookings/{id}/studies`
**Purpose:** Record an acquired study against a booking (FR-IMG-02, `docs/DATABASE_DESIGN.md` §5.1).
**Auth:** `GET` Patient/Facility Staff/Radiologist; `POST` Facility Staff (radiographer), only permitted once the booking's status is `images_acquired`.
**POST request body:**
```json
{ "modality_id": "mod_us", "dicom_study_instance_uid": "1.2.840.113619.2.55...",
  "pacs_storage_reference": "orthanc://studies/8f2a1c...", "image_count": 42 }
```
**Response `201 Created`:** the study record, `status: "pending_report"` — this creates the eligibility for §7's matching engine to pick it up if the facility has no on-site radiologist.
**Errors:** `409 BOOKING_NOT_READY_FOR_STUDY` (booking isn't in `images_acquired` status) · `409 DUPLICATE_DICOM_UID`

### `GET /studies/{id}`
**Purpose:** Study metadata + a signed, time-limited URL for the DICOM viewer to load from PACS (`docs/ARCHITECTURE.md` §11).
**Auth:** Patient (own)/Facility Staff/Radiologist. Every call is written to `audit_logs` (FR-ADM-05) — this endpoint is one of the two or three most audit-sensitive reads in the whole API.
**Response `200 OK`:** `{ "id": "study_...", "modality": "ultrasound", "image_count": 42, "status": "reported", "viewer_url": "https://viewer.radiologyuber.com/wado?token=..." }`
**Errors:** `404` (per §0.6)

### `POST /studies/{id}/reports`
**Purpose:** Begin a report (FR-IMG-03/04, UX_DESIGN C3).
**Auth:** Radiologist (verified) — either the facility's own in-house radiologist, or a radiologist who has `accept`ed the corresponding `match_offer` (§7).
**Request body:** `{}` (creates an empty draft the radiologist then edits via `PATCH`).
**Response `201 Created`:** `{ "id": "rpt_...", "study_id": "study_...", "status": "draft", "findings": null, "impression": null, "is_critical_finding": false }`
**Errors:** `403 NOT_ASSIGNED_TO_THIS_STUDY` · `409 REPORT_ALREADY_EXISTS_FOR_STUDY`

### `PATCH /reports/{id}`
**Purpose:** Edit a report while still in draft (UX_DESIGN C3).
**Auth:** Radiologist (verified, must be `reports.radiologist_user_id`), only while `status = 'draft'`.
**Request body:** `{ "findings": "...", "impression": "...", "is_critical_finding": true }`
**Response `200 OK`:** the updated draft.
**Errors:** `409 REPORT_ALREADY_SUBMITTED` (the API-level mirror of the database immutability trigger, `docs/DATABASE_DESIGN.md` §5.2 — the client should never be able to attempt this, but the API enforces it regardless of client-side bugs)

### `POST /reports/{id}/submit`
**Purpose:** Sign and lock the report (FR-IMG-05, UX_DESIGN C4's confirmation step). Idempotency-Key supported.
**Auth:** Radiologist (verified, own draft).
**Request body:** `{}`
**Response `200 OK`:** `{ "id": "rpt_...", "status": "submitted", "submitted_at": "...", "signed_at": "..." }` — this call triggers, server-side: the DB immutability trigger locking further edits, a `report.ready` event (notifying patient + referring doctor, FR-IMG-06), and — if `is_critical_finding: true` — the high-priority simultaneous push+SMS escalation path (FR-NOTIF-03, `docs/ARCHITECTURE.md` §8.2).
**Errors:** `422 FINDINGS_AND_IMPRESSION_REQUIRED` · `409 REPORT_ALREADY_SUBMITTED`

### `POST /reports/{id}/addenda` / `GET /reports/{id}/addenda`
**Purpose:** The append-only correction mechanism (`docs/DATABASE_DESIGN.md` §5.3).
**Auth:** `POST` Radiologist (verified); `GET` Patient/Doctor/Facility Staff.
**POST request body:** `{ "content": "Addendum: left kidney measurement corrected to 10.2cm from initial 9.2cm reading." }`
**Response `201 Created`:** the addendum record with `author_user_id` and `created_at`.
**Errors:** `404 REPORT_NOT_FOUND`

### `GET /patients/{id}/imaging-history`
**Purpose:** The longitudinal record across providers (FR-IMG-07, UX_DESIGN A7).
**Auth:** Patient (own) or Doctor — a doctor's call additionally requires an active `consent_records` grant of type `data_sharing` naming that doctor; absent that, the API returns `403 CONSENT_NOT_GRANTED` rather than an empty list, so a doctor can distinguish "nothing to see" from "you're not authorized to see it" (a deliberate exception to the 404-masking convention in §0.6, because here confirming a *history exists but isn't shared with you* is itself useful, non-sensitive information for a treating doctor's workflow, unlike a stranger probing another patient's account).
**Response `200 OK`:** `{ "data": [ { "study_date": "...", "modality": "...", "facility_name": "...", "report_id": "..." }, "..." ] }`

---

## 7. Marketplace Matching

### `POST /match-requests`
**Purpose:** A facility posts a teleradiology report request or a radiographer shift request (FR-MATCH-01/05, `docs/DATABASE_DESIGN.md` §6.1).
**Auth:** Facility Staff.
**Request body (report request):**
```json
{ "request_type": "report_request", "study_id": "study_...", "modality_id": "mod_ct", "is_urgent": false }
```
**Request body (shift request):**
```json
{ "request_type": "shift_request", "modality_id": "mod_us",
  "shift_start_time": "2026-08-01T08:00:00Z", "shift_end_time": "2026-08-01T14:00:00Z" }
```
**Response `201 Created`:** the match request, `status: "open"`, `sla_deadline` computed server-side from the modality's default turnaround target — this immediately triggers the matching engine's dispatch logic (creating `match_offers` to eligible, currently-online practitioners, §5.5 of the architecture doc), which the client does not call directly.
**Errors:** `422 REQUEST_TYPE_FIELD_MISMATCH` (mirrors the DB `CHECK` constraint — a `report_request` must carry `study_id` and no shift times, and vice versa) · `409 STUDY_ALREADY_HAS_OPEN_REQUEST`

### `GET /match-requests` / `GET /match-requests/{id}`
**Purpose:** A facility views its own posted requests and their fulfillment status (UX_DESIGN D5); a radiologist/radiographer views requests they've been offered (cross-referenced via their own `match_offers`, not a general browse of all open requests — nobody sees requests they haven't been matched-eligible for).
**Auth:** Facility Staff (own facility's requests)/Radiologist/Radiographer (own offered requests only).

### `PATCH /match-requests/{id}`
**Purpose:** Cancel a request, or escalate its urgency (UX_DESIGN D5's "escalate" action).
**Auth:** Facility Staff (own facility).
**Request body:** `{ "is_urgent": true }` or `{ "status": "cancelled" }`
**Errors:** `409 REQUEST_ALREADY_MATCHED`

### `GET /match-offers`
**Purpose:** A practitioner's own worklist of offered cases/shifts (UX_DESIGN B3/C2), filterable by `response_status`.
**Auth:** Radiologist/Radiographer.
**Response `200 OK`:** `{ "data": [ { "id": "off_...", "match_request": { "...": "..." }, "response_status": "offered", "response_deadline": "2026-07-28T09:35:00Z" } ] }`

### `POST /match-offers/{id}/accept`
**Purpose:** FR-MATCH-03, UX_DESIGN B3/C5's core action.
**Auth:** Radiologist/Radiographer (verified) — the offer's `offered_to_user_id`.
**Response `200 OK`:** the offer with `response_status: "accepted"`, `responded_at` set; the parent `match_request` flips to `matched`, and all *other* still-open offers for the same request are marked `revoked` server-side (the concurrency-safe sequence described in `docs/ARCHITECTURE.md` §5.5).
**Errors:** `409 OFFER_EXPIRED` · `409 OFFER_ALREADY_RESPONDED` · `409 REQUEST_ALREADY_MATCHED` (someone else accepted first — the exact race this endpoint is designed to fail safely on)

### `POST /match-offers/{id}/decline`
**Purpose:** FR-MATCH-03.
**Auth:** Radiologist/Radiographer (own offer).
**Response `200 OK`:** the offer with `response_status: "declined"` — triggers the matching engine to offer the next eligible candidate.
**Errors:** `409 OFFER_ALREADY_RESPONDED`

---

## 8. Payments & Payouts

### `POST /bookings/{id}/payments`
**Purpose:** Initiate payment for a confirmed booking (FR-PAY-02, UX_DESIGN A5). Idempotency-Key supported.
**Auth:** Patient (the booking's `booked_by_user_id`).
**Request body:** `{ "method": "momo", "provider": "mtn_momo", "momo_phone_number": "+233241234567" }` (for `method: "card"`, the response instead includes a redirect/checkout URL to the PSP's hosted page rather than accepting card details directly — §0's PCI-scope reasoning, `docs/ARCHITECTURE.md` §9.1).
**Response `202 Accepted`:**
```json
{ "id": "pay_...", "status": "pending", "amount_ghs": 189.00, "method": "momo",
  "message": "Approve the payment prompt on your phone." }
```
Final status (`captured`/`failed`) is delivered via the payment-provider webhook (see below) and reflected when the client polls or re-fetches `GET /payments/{id}` — matching UX_DESIGN A5's "waiting for MoMo approval" state design.
**Errors:** `409 PAYMENT_ALREADY_CAPTURED_FOR_BOOKING` (the partial-unique-index rule, `docs/DATABASE_DESIGN.md` §7.1) · `422 UNSUPPORTED_PAYMENT_METHOD`

### `GET /payments/{id}`
**Purpose:** Poll payment status (UX_DESIGN A5).
**Auth:** Patient (own)/Admin.
**Response `200 OK`:** `{ "id": "pay_...", "status": "captured", "amount_ghs": 189.00, "method": "momo", "completed_at": "..." }`

### `POST /payments/{id}/refund`
**Purpose:** FR-PAY-07.
**Auth:** Admin (finance department).
**Request body:** `{ "amount_ghs": 189.00, "reason": "Booking cancelled outside patient's control — facility equipment failure." }`
**Response `201 Created`:** the refund record, `status: "pending"` (async settlement via the PSP).
**Errors:** `422 REFUND_EXCEEDS_ORIGINAL_AMOUNT` · `409 PAYMENT_NOT_REFUNDABLE`

### `GET /payouts`, `GET /payouts/{id}`, `GET /payouts/{id}/line-items`
**Purpose:** Facility/practitioner-side payout visibility (FR-PAY-06, UX_DESIGN B5/C6/D8) and platform-wide oversight for Finance admin.
**Auth:** Facility Staff (admin, own facility)/Radiologist/Radiographer (own)/Admin (any).
**Response (`/payouts/{id}/line-items`):** `{ "data": [ { "booking_id": "bk_...", "amount_ghs": 171.00, "description": "Booking RU-2026-88213" } ] }` — the itemized detail UX_DESIGN B5/D8 requires so "why was I paid this" is always answerable from the API alone.

### `POST /webhooks/payments/{provider}`
**Purpose:** Inbound PSP webhook (payment authorized/captured/failed/refunded — `docs/ARCHITECTURE.md` §9.3).
**Auth:** Webhook — verified via the provider's signature header (e.g., `X-Paystack-Signature`), not a JWT. Requests failing signature verification are rejected with `401` and are not processed.
**Request body:** provider-specific raw payload — stored verbatim into `payment_events.raw_payload` (JSONB, `docs/DATABASE_DESIGN.md` §7.2) before any interpretation, so the exact wire event is always recoverable for reconciliation regardless of how the platform's own logic later changes.
**Response:** `200 OK` (empty body) — required quickly, since PSPs retry on non-2xx or timeout; heavy processing (updating `payments.status`, emitting the `payment.captured` event) happens asynchronously after the webhook is acknowledged, not inline in the request/response cycle.
**Errors:** `401 SIGNATURE_VERIFICATION_FAILED`

---

## 9. Trust, Disputes & Notifications

### `POST /bookings/{id}/rating`
**Purpose:** FR-TRUST-01, UX_DESIGN A7's implicit post-visit flow.
**Auth:** Patient (own booking, must be `status = 'completed'`).
**Request body:** `{ "score": 5, "comment": "Fast and the report came back same day." }`
**Response `201 Created`:** the rating.
**Errors:** `409 BOOKING_NOT_COMPLETED` · `409 ALREADY_RATED` · `422 SCORE_OUT_OF_RANGE`

### `GET /facilities/{id}/ratings`
**Purpose:** Public rating display (UX_DESIGN A3 result cards).
**Auth:** Public.
**Response:** paginated list of ratings plus the facility's aggregate `rating_average`.

### `POST /disputes`
**Purpose:** FR-TRUST-03.
**Auth:** Authenticated (any role can raise one against a booking they're party to).
**Request body:** `{ "booking_id": "bk_...", "category": "late_report", "description": "Report was promised within 24 hours but took 4 days." }`
**Response `201 Created`:** the dispute, `status: "open"`.
**Errors:** `403 NOT_PARTY_TO_BOOKING`

### `GET /disputes` / `GET /disputes/{id}` / `POST /disputes/{id}/events`
**Purpose:** UX_DESIGN F6's thread view; a non-admin caller sees only their own disputes.
**Auth:** Authenticated (own)/Admin (all).
**POST `/events` request body:** `{ "event_type": "comment", "content": "Any update on this?" }`
**Errors:** `403 NOT_YOUR_DISPUTE`

### `PATCH /disputes/{id}`
**Purpose:** Admin resolution action (FR-ADM-03).
**Auth:** Admin.
**Request body:** `{ "status": "resolved", "resolution_notes": "Facility issued a partial refund; radiologist coached on SLA adherence." }`
**Response `200 OK`:** the updated dispute; also writes a `status_change` row to `dispute_events` automatically (not a separate client call).

### `POST /devices` / `DELETE /devices/{id}`
**Purpose:** Register/unregister a push notification token (FCM, `docs/ARCHITECTURE.md` §8.1).
**Auth:** Authenticated.
**POST request body:** `{ "platform": "android", "push_token": "fcm_token_string..." }`
**Response `201 Created`:** `{ "id": "dev_...", "platform": "android" }`

### `GET /notifications` / `PATCH /notifications/{id}/read`
**Purpose:** In-app notification feed (supplementary to push/SMS — a durable record the user can revisit, matching the `notifications` table, `docs/DATABASE_DESIGN.md` §10).
**Auth:** Authenticated (own).

### `PATCH /users/me/notification-preferences`
**Purpose:** UX_DESIGN A8's preference toggles.
**Auth:** Authenticated.
**Request body:** `{ "push_enabled": true, "sms_enabled": true }` — note: critical-finding alerts are **not** a configurable field here; they always send via both channels regardless of preference (FR-NOTIF-03), and the API deliberately does not expose a way to opt out of them.
**Errors:** `422 CANNOT_DISABLE_CRITICAL_ALERTS` (returned if a client attempts to pass a critical-alert-related override field, even though none is documented — defense in depth against a client bug or a modified client build)

---

## 10. Admin & Ops

All endpoints in this section require the **Admin** auth tag; several are further scoped to a specific admin `department` (`ops` vs. `finance`), noted per endpoint.

### `GET /admin/dashboard/metrics`
**Purpose:** Backs UX_DESIGN F2 — PRD §10's North Star and input metrics as an API response, not a hand-built report.
**Auth:** Admin.
**Query params:** `region`, `from`, `to`.
**Response `200 OK`:**
```json
{
  "north_star": { "completed_bookings_within_sla": 412, "period": "2026-W30" },
  "inputs": {
    "search_to_booking_conversion": 0.31, "unmet_demand_rate": 0.08,
    "teleradiology_fulfillment_rate": 0.94, "active_verified_radiologists": 22,
    "active_onboarded_facilities": 17, "payment_completion_rate": 0.97
  },
  "guardrails": { "critical_finding_notification_latency_seconds_p95": 41, "dispute_rate": 0.012 }
}
```

### `GET /admin/credential-documents`
**Purpose:** UX_DESIGN F3's queue.
**Auth:** Admin (ops).
**Query params:** `review_status=pending` (default), `document_type`.
**Response:** paginated list, oldest-first.

### `POST /admin/credential-documents/{id}/approve` / `.../reject`
**Purpose:** FR-ID-04.
**Auth:** Admin (ops).
**Reject request body:** `{ "rejection_reason": "License number does not match AHPC registry." }` (required, never optional — UX_DESIGN F3's "never a silent rejection" rule enforced at the API, not just the UI).
**Response `200 OK`:** the updated document; approval of a practitioner's final required document also flips the parent profile's `verification_status` to `verified` server-side.
**Errors:** `422 REJECTION_REASON_REQUIRED`

### `GET /admin/facilities` / `POST /admin/facilities/{id}/verify`
**Purpose:** Facility-side counterpart to credentialing.
**Auth:** Admin (ops).
**Response (`verify`):** the facility with `verification_status: "verified"` — this is what makes a facility's services actually appear in public `GET /facilities` search results.

### `POST /admin/bookings/{id}/override`
**Purpose:** FR-ADM-04's manual override (UX_DESIGN F4), e.g., force-reassigning a stuck teleradiology request.
**Auth:** Admin (ops).
**Request body:** `{ "action": "force_status", "new_status": "cancelled", "note": "Facility closed unexpectedly; patient contacted for rebooking." }`
**Response `200 OK`:** the updated booking. This bypasses the normal endpoint-per-transition design (§5) deliberately — it exists specifically as an escape hatch for situations those endpoints can't express, and every call is written to `audit_logs` with the admin's identity and note, since bypassing normal state-machine rules is exactly the kind of action that must never be silent.
**Errors:** `422 NOTE_REQUIRED_FOR_OVERRIDE`

### `GET /admin/match-requests/monitor`
**Purpose:** UX_DESIGN F5's live operational view.
**Auth:** Admin (ops).
**Response:** open match requests sorted by proximity to `sla_deadline`, each with its full `match_offers` history embedded — the "why hasn't this been picked up" view described in the UX spec, in one call rather than requiring the admin console to stitch together two endpoints per row.

### `GET /admin/audit-logs`
**Purpose:** FR-ADM-05, UX_DESIGN F8. Cursor-paginated (§0.3).
**Auth:** Admin (ops).
**Query params:** `actor_user_id`, `resource_type`, `resource_id`, `from`, `to`, `cursor`.
**Response `200 OK`:** `{ "data": [ { "id": "8834021", "actor_user_id": "8b2f...", "action": "view_report", "resource_type": "report", "resource_id": "rpt_...", "occurred_at": "..." } ], "meta": { "next_cursor": "eyJpZCI6ODgzNDAyMX0=" } }`

### `GET /admin/users/{id}`
**Purpose:** UX_DESIGN F9's 360-degree account view.
**Auth:** Admin.
**Response `200 OK`:** base user record, all held roles/profiles, `account_status`, and summary links (not full embedded lists) to that user's bookings/disputes/credential history — kept to summaries/counts plus links rather than embedding everything, since this single endpoint could otherwise become unboundedly large for a long-tenured user.

### `POST /admin/users/{id}/suspend` / `.../reactivate`
**Auth:** Admin.
**Request body (`suspend`):** `{ "reason": "Repeated payment fraud attempts flagged by anomaly detection." }` (required).
**Response `200 OK`:** the user with updated `account_status`. Suspension takes effect immediately on the next request the user makes, not on token expiry — because `account_status` is checked live per request, the same live-check pattern already established for practitioner `verification_status` (`docs/ARCHITECTURE.md` §6.3).
**Errors:** `422 REASON_REQUIRED`

### `GET /admin/feature-flags` / `PATCH /admin/feature-flags/{key}`
**Purpose:** UX_DESIGN F10, `docs/ARCHITECTURE.md` §14's phased-rollout capability.
**Auth:** Admin.
**PATCH request body:** `{ "enabled": true, "scope": { "region": "Kumasi" } }`
**Response `200 OK`:** the updated flag; every change is appended to a change-history log (returned via a `GET /admin/feature-flags/{key}/history`-style expansion embedded in the response, not a separate undocumented mechanism) since a live flag change on a running marketplace is itself a consequential, auditable action.

---

## 11. Error Code Reference (Consolidated)

A non-exhaustive index of the most significant `error.code` values referenced above, grouped by the failure class they represent — useful for client-side error handling logic that needs to branch on category rather than exact string.

| Category | Example codes |
|---|---|
| **Auth/session** | `OTP_INVALID`, `OTP_EXPIRED`, `INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`, `REFRESH_TOKEN_INVALID_OR_REVOKED`, `MFA_CODE_INVALID` |
| **Authorization/RBAC** | `INSUFFICIENT_STAFF_ROLE`, `NOT_YOUR_DEPENDENT`, `NOT_ASSIGNED_TO_THIS_STUDY`, `PROFILE_NOT_YET_VERIFIED`, `CONSENT_NOT_GRANTED` |
| **Concurrency/state conflict** | `SLOT_NO_LONGER_AVAILABLE`, `REQUEST_ALREADY_MATCHED`, `OFFER_ALREADY_RESPONDED`, `OFFER_EXPIRED`, `REPORT_ALREADY_SUBMITTED`, `PAYMENT_ALREADY_CAPTURED_FOR_BOOKING` |
| **Validation** | `INVALID_PHONE_FORMAT`, `EXACTLY_ONE_BENEFICIARY_REQUIRED`, `PRICE_MUST_BE_NON_NEGATIVE`, `SCORE_OUT_OF_RANGE`, `REJECTION_REASON_REQUIRED` |
| **Not found (or masked)** | `FACILITY_NOT_FOUND`, `REPORT_NOT_FOUND`, generic `404` (see §0.6 for the deliberate ambiguity) |
| **Rate limiting** | `RATE_LIMITED` |
| **Payments** | `SIGNATURE_VERIFICATION_FAILED`, `REFUND_EXCEEDS_ORIGINAL_AMOUNT`, `PAYMENT_NOT_REFUNDABLE` |

---

## 12. What's Deliberately Not an Endpoint

A few things worth stating explicitly so their absence reads as a decision, not an omission, consistent with the same discipline `docs/DATABASE_DESIGN.md` §11.3 applied to schema scope:

- **No `DELETE /bookings/{id}`, `/reports/{id}`, `/users/{id}`, or `/payments/{id}`.** Nothing that represents clinical, financial, or credentialing history is ever hard-deleted via the API — only status-transitioned (`cancel`, `suspend`, `reject`), mirroring the no-hard-delete principle in `docs/DATABASE_DESIGN.md` §11.2.
- **No client-facing `POST /match-requests/{id}/assign`.** Matching/offer dispatch is a server-side process triggered by `POST /match-requests` and resolved through `POST /match-offers/{id}/accept` — no endpoint lets any client directly assign a practitioner to a case, since that would bypass the audited offer/accept flow that makes the matching engine's decisions traceable (FR-MATCH-07).
- **No generic `PATCH /bookings/{id} { status }`.** As noted in §5, every lifecycle transition is its own named action endpoint — deliberately less "RESTfully generic" in the classic CRUD sense, in exchange for making invalid transitions structurally harder to attempt from any client.
- **No AI/ML endpoints in this version.** Consistent with `docs/ARCHITECTURE.md` §13's scope discipline — no diagnostic-AI or triage-model endpoint exists in this API yet; any future assistive feature (worklist ranking, matching optimization) is designed as an internal service consuming existing data, not a new patient- or radiologist-facing endpoint category, until that Phase 2+ work is explicitly scoped and its own regulatory review is complete.

---

## 13. Approval

Requires sign-off from Head of Engineering (contract correctness, versioning policy) and Medical/Regulatory Advisor (specifically §6's reporting/immutability endpoints and §10's audit/credentialing endpoints) before implementation begins — the same review discipline applied to every prior document in this series.

| Reviewer | Role | Status |
|---|---|---|
| — | Head of Engineering | Pending |
| — | Medical/Regulatory Advisor | Pending |
