# Mock FSSAI / Food Safety Approval Portal (SIH26130)

> **IMPORTANT PROTOTYPE DISCLAIMER:**
> This application is an external approval portal simulation developed for the **Smart India Hackathon (SIH26130)** evaluation prototype. It **does NOT** connect to, claim to be, or represent the official Food Safety and Standards Authority of India (FSSAI) or FoSCoS portal.

---

## 1. Project Overview & Architecture

The **Mock FSSAI Portal** is a production-style, database-backed simulation of a statutory food safety licensing authority. It serves as an approval provider for the **Main SIH Industrial Approval System**.

```
┌─────────────────────────┐
│     MAIN SIH PORTAL     │
│   (Single Window Hub)   │
└───────────┬─────────────┘
            │ 
            │ HTTPS REST API with X-API-Key
            ▼
┌─────────────────────────────────────────────────────────────┐
│                   MOCK FSSAI BACKEND (FastAPI)              │
├──────────────────────────────┬──────────────────────────────┤
│ • Integration API (Prefill)  │ • Document Scrutiny Engine   │
│ • State Transition Machine   │ • OTP Verification Service   │
│ • Review Priority Engine     │ • Webhook Event Dispatcher   │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
     ┌──────────────────┐           ┌──────────────────┐
     │  PostgreSQL / DB │           │  Uploads Storage │
     └──────────────────┘           └──────────────────┘
               ▲                              ▲
               │                              │
 ┌─────────────┴────────────┐   ┌─────────────┴────────────┐
 │  FBO APPLICANT PORTAL    │   │  OFFICER SCRUTINY PORTAL │
 │  (React + TS + Tailwind) │   │  (React + TS + Tailwind) │
 └──────────────────────────┘   └──────────────────────────┘
```

---

## 2. Technology Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, ReportLab (PDF generation), PyJWT / Passlib (Bcrypt), SQLite / PostgreSQL.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide React Icons.
- **Testing:** Pytest with FastAPI TestClient (100% passing e2e suite).

---

## 3. Project Structure

```
mock-fssai-portal/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, Database, Security, State Machine, Dependencies
│   │   ├── models/         # SQLAlchemy Models & Enums
│   │   ├── schemas/        # Pydantic Schemas (Auth, App, Integration, Docs)
│   │   ├── services/       # OTP, Storage, Risk Engine, PDF, Audit, Notifications, Webhooks
│   │   ├── routers/        # Auth, Applicant, Officer, Documents, Admin, Integration
│   │   ├── seed/           # Seed demo data (Rahul Kumar, Officer Meena, Admin)
│   │   └── main.py         # FastAPI application entry point
│   ├── tests/
│   │   └── test_e2e_flow.py # Complete 12-step integration test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Stepper, StatusBadge, DocumentStatusBadge, RiskBadge, Navbar, Sidebar
│   │   ├── pages/          # Landing, ApplicantAuth, OfficerAuth, ApplicantDash, Wizard, Detail, OfficerDash, Scrutiny, Admin, ApiDocs
│   │   ├── context/        # AuthContext (JWT session state)
│   │   ├── services/       # Axios API client
│   │   ├── types/          # TypeScript interface definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── uploads/                # Isolated document filesystem storage
├── docker-compose.yml
└── README.md
```

---

## 4. Quick Start & Setup Commands

### Step A: Backend Setup & Startup
```powershell
# 1. Navigate to root
cd d:\SIH\Mock_FSSAI

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Start Backend Server (runs on port 8000)
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload --port 8000
```

### Step B: Frontend Setup & Startup
```powershell
# 1. Navigate to frontend directory
cd d:\SIH\Mock_FSSAI\frontend

# 2. Install NPM dependencies
npm install

# 3. Start Vite Dev Server (runs on port 5173)
npm run dev
```

### Step C: Run Backend Test Suite
```powershell
$env:PYTHONPATH="backend"
python -m pytest backend/tests/ -v
```

---

## 5. Demo Accounts & Credentials

| Role | Email | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Applicant (FBO)** | `rahul@example.com` | `Password123!` | FBO Portal, draft completion, document upload, OTP submit, query response |
| **Scrutiny Officer**| `officer.meena@fssai.gov.in`| `Officer123!`| Officer Scrutiny Console, document review, query manager, inspection scheduler |
| **System Admin** | `admin@fssai.gov.in` | `Admin123!` | Admin Console, officer management, audit logs, integration logs |

> **Development Mode OTP:** `123456`

---

## 6. Main SIH Portal Integration API Contract

All server-to-server integration calls from your Main SIH Portal backend must supply the **`X-API-Key`** header:
```http
X-API-Key: fssai-mock-secret-key-2026
```

### A. Prefill Application
**`POST /api/integrations/v1/applications/prefill`**

```bash
curl -X POST http://localhost:8000/api/integrations/v1/applications/prefill \
  -H "X-API-Key: fssai-mock-secret-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "external_reference_id": "SIH-APP-1001",
    "source_system": "SIH26130",
    "applicant": {
      "applicant_name": "Rahul Kumar",
      "designation": "Managing Director",
      "mobile": "9876543210",
      "email": "rahul@example.com"
    },
    "business": {
      "business_name": "ABC Foods Pvt Ltd",
      "legal_name": "ABC Foods Private Limited",
      "organization_type": "PRIVATE_LIMITED",
      "business_type": "MANUFACTURING_UNIT",
      "kind_of_food_business": "Food Manufacturing / Processing",
      "business_activity": "Packaged Snack Manufacturing",
      "project_stage": "NEW",
      "state": "Tamil Nadu",
      "district": "Salem",
      "pincode": "636001",
      "address_line_1": "Plot 42, SIDCO Industrial Estate, Omalur Road",
      "investment_amount": 50000000.0,
      "employee_count": 45,
      "gst_number": "33AABCA1234F1Z5",
      "pan_number": "AABCA1234F",
      "udyam_number": "UDYAM-TN-24-0012345"
    },
    "activities": ["MANUFACTURING", "PROCESSING", "PACKAGING"],
    "products": [
      {
        "product_name": "Masala Potato Chips",
        "product_category": "Packaged Snack Foods",
        "description": "Potato-based packaged snack",
        "expected_capacity": 5000,
        "unit_of_measure": "kg/day"
      }
    ]
  }'
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "application_id": "8f3b7b21-...",
    "application_number": "FSSAI-MOCK-2026-000123",
    "external_reference_id": "SIH-APP-1001",
    "status": "DRAFT",
    "prefilled_fields": 20,
    "missing_fields": [
      "Identity Proof",
      "Address Proof",
      "Passport-size Photograph",
      "Food Product / Category Details"
    ],
    "message": "Draft application created and pre-filled from Main SIH Portal."
  }
}
```

### B. Upload Document via Integration API
**`POST /api/integrations/v1/applications/{application_number}/documents`**

```bash
curl -X POST http://localhost:8001/api/integrations/v1/applications/FSSAI-MOCK-2026-000123/documents \
  -H "X-API-Key: fssai-mock-secret-key-2026" \
  -F "requirement_id=identity_proof" \
  -F "file=@identity_proof.pdf"
```

### C. Check Status Synchronization
**`GET /api/integrations/v1/applications/{application_number}/status`**

```bash
curl -X GET http://localhost:8001/api/integrations/v1/applications/FSSAI-MOCK-2026-000123/status \
  -H "X-API-Key: fssai-mock-secret-key-2026"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "application_number": "FSSAI-MOCK-2026-000123",
    "external_reference_id": "SIH-APP-1001",
    "status": "DOCUMENT_QUERY",
    "last_updated_at": "2026-09-26T11:45:00Z",
    "pending_actions": [
      {
        "type": "DOCUMENT",
        "message": "Re-upload Address Proof: Uploaded address proof does not match the business address."
      }
    ],
    "officer_remarks": "Uploaded address proof does not match the business address.",
    "queries_count": 1,
    "inspection_scheduled": false
  }
}
```

---

## 7. Application State Machine

```
[DRAFT]
   │
   ▼ (Applicant Submits with OTP / Integration Submit)
[SUBMITTED]
   │
   ▼ (Officer begins scrutiny)
[UNDER_REVIEW] ───────────────┬────────────────────────────┐
   │                          │                            │
   ▼ (Officer finds defect)   ▼ (Site audit required)      │
[DOCUMENT_QUERY]        [INSPECTION_REQUIRED]              │
   │                          │                            │
   ▼ (Applicant responds)     ▼ (Officer schedules date)   │
[UNDER_REVIEW]          [INSPECTION_SCHEDULED]             │
   │                          │                            │
   ├──────────────────────────┴────────────────────────────┤
   │                                                       │
   ▼ (All criteria met)                                    ▼ (Non-compliance)
[APPROVED]                                             [REJECTED]
```

---

## 8. Interactive End-to-End Demo Walkthrough

1. **Prefill via API:** Execute the `POST /api/integrations/v1/applications/prefill` cURL command.
2. **Open Applicant Portal:** Navigate to `http://localhost:5173/applicant/login` and log in as `rahul@example.com` / `Password123!`.
3. **Review & Upload:** Open the prefilled draft, verify pre-populated fields, upload the 4 statutory documents (**Identity Proof**, **Address Proof**, **Passport-size Photograph**, **Food Product / Category Details**), and click **Save Draft**.
4. **Submit with OTP:** On Step 8, enter development OTP `123456` and submit (submission is blocked until all 4 documents are uploaded).
5. **Officer Scrutiny:** Log out, then log in at `http://localhost:5173/officer/login` as `officer.meena@fssai.gov.in` / `Officer123!`.
6. **Query / Reject Document:** In the application review tab, mark Address Proof as `NEEDS_CORRECTION` with remark `"Uploaded address proof does not match the business address."`. Status transitions to `DOCUMENT_QUERY`.
7. **Applicant Correction:** Log in as Rahul Kumar, view the officer remark on the details page, upload the corrected document, and submit a response.
8. **Schedule Inspection & Approval:** Officer marks document `ACCEPTED`, clicks **Schedule Inspection**, and finally clicks **Move to APPROVED**.
9. **Status Sync:** Query `GET /api/integrations/v1/applications/{app}/status` to verify instant synchronization of the `APPROVED` state.
