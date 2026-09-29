import io
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.config import settings
from app.core.database import Base, get_db
from app.seed.seed_data import seed_database

# Create isolated in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "mock-fssai-portal"

def test_user_registration_and_validation():
    # 1. Password mismatch
    res_err = client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "test.mismatch@example.com",
        "mobile": "9876500001",
        "password": "Password123!",
        "confirm_password": "MismatchPassword!"
    })
    assert res_err.status_code == 400

    # 2. Valid registration
    res = client.post("/api/v1/auth/register", json={
        "name": "Gopal Foods",
        "email": "gopal@example.com",
        "mobile": "9876500002",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert "access_token" in res.json()["data"]

def test_applicant_and_officer_login():
    # 1. Applicant Login
    res = client.post("/api/v1/auth/login", json={
        "email": "rahul@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    app_data = res.json()
    assert app_data["success"] is True
    assert "access_token" in app_data["data"]
    assert app_data["data"]["user"]["role"] == "APPLICANT"

    # 2. Officer Login
    res_off = client.post("/api/v1/auth/login", json={
        "email": "officer.meena@fssai.gov.in",
        "password": "Officer123!"
    })
    assert res_off.status_code == 200
    off_data = res_off.json()
    assert off_data["data"]["user"]["role"] == "OFFICER"

    # 3. Admin Login
    res_admin = client.post("/api/v1/auth/login", json={
        "email": "admin@fssai.gov.in",
        "password": "Admin123!"
    })
    assert res_admin.status_code == 200
    admin_data = res_admin.json()
    assert admin_data["data"]["user"]["role"] == "ADMIN"

def test_unauthorized_cross_tenant_access():
    res_other = client.post("/api/v1/auth/register", json={
        "name": "Other Applicant",
        "email": "other@example.com",
        "mobile": "9876500003",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert res_other.status_code == 200
    other_token = res_other.json()["data"]["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    res_forbidden = client.get(
        "/api/v1/applicant/applications/FSSAI-MOCK-2026-000101",
        headers=other_headers
    )
    assert res_forbidden.status_code == 403

def test_document_requirements_endpoint():
    res = client.get("/api/v1/documents/requirements")
    assert res.status_code == 200
    reqs = res.json()["data"]
    assert len(reqs) == 4
    req_names = [r["name"] for r in reqs]
    assert "Identity Proof" in req_names
    assert "Address Proof" in req_names
    assert "Passport-size Photograph" in req_names
    assert "Food Product / Category Details" in req_names

def test_integration_api_auth_prefill_and_document_workflow():
    # 1. Test invalid API key rejected with 401
    invalid_res = client.post(
        "/api/integrations/v1/applications/prefill",
        headers={"X-API-Key": "wrong-key"},
        json={"external_reference_id": "SIH-TEST-001", "source_system": "SIH26130"}
    )
    assert invalid_res.status_code == 401

    # 2. Valid Prefill API call for ABC Foods Pvt Ltd (Salem, Tamil Nadu)
    ext_id = f"SIH-APP-TEST-{int(datetime.now().timestamp())}"
    prefill_payload = {
        "external_reference_id": ext_id,
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
            "employee_count": 40
        },
        "activities": ["MANUFACTURING", "PROCESSING", "PACKAGING"],
        "premises": {
            "ownership_type": "OWNED",
            "address_line_1": "Plot 42, SIDCO Industrial Estate, Omalur Road",
            "state": "Tamil Nadu",
            "district": "Salem",
            "pincode": "636001"
        },
        "products": [
            {
                "product_name": "Masala Chips",
                "product_category": "Packaged Snack",
                "description": "Potato-based spicy snack",
                "expected_capacity": 5000,
                "unit_of_measure": "kg/day"
            }
        ]
    }

    res = client.post(
        "/api/integrations/v1/applications/prefill",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY},
        json=prefill_payload
    )
    assert res.status_code == 200
    data = res.json()["data"]
    app_number = data["application_number"]
    assert data["status"] == "DRAFT"
    assert data["external_reference_id"] == ext_id

    # 3. Check document checklist returns exactly 4 items with NOT_UPLOADED status
    doc_list_res = client.get(
        f"/api/v1/documents/application/{app_number}",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert doc_list_res.status_code == 200
    doc_list = doc_list_res.json()["documents"]
    assert len(doc_list) == 4
    for doc in doc_list:
        assert doc["status"] == "NOT_UPLOADED"

    # 4. Attempt submission before all 4 documents uploaded -> MUST BE BLOCKED
    submit_blocked_res = client.post(
        f"/api/integrations/v1/applications/{app_number}/submit",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert submit_blocked_res.status_code == 400
    err_body = submit_blocked_res.json()
    assert err_body["success"] is False
    assert err_body["error"]["code"] == "REQUIRED_DOCUMENTS_MISSING"
    assert len(err_body["error"]["missing_documents"]) == 4

    # 5. Upload document 1: Identity Proof
    dummy_pdf_1 = io.BytesIO(b"%PDF-1.4 Identity Proof Government ID")
    doc_res_1 = client.post(
        f"/api/integrations/v1/applications/{app_number}/documents",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY},
        data={"requirement_id": "identity_proof"},
        files={"file": ("identity_proof.pdf", dummy_pdf_1, "application/pdf")}
    )
    assert doc_res_1.status_code == 200
    assert doc_res_1.json()["data"]["review_status"] == "PENDING_REVIEW"

    # 6. Upload document 2: Address Proof
    dummy_pdf_2 = io.BytesIO(b"%PDF-1.4 Address Proof Electricity Bill")
    doc_res_2 = client.post(
        f"/api/integrations/v1/applications/{app_number}/documents",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY},
        data={"requirement_id": "address_proof"},
        files={"file": ("address_proof.pdf", dummy_pdf_2, "application/pdf")}
    )
    assert doc_res_2.status_code == 200

    # 7. Upload document 3: Passport-size Photograph
    dummy_jpg_3 = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb")
    doc_res_3 = client.post(
        f"/api/integrations/v1/applications/{app_number}/documents",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY},
        data={"requirement_id": "passport_photo"},
        files={"file": ("applicant_photo.jpg", dummy_jpg_3, "image/jpeg")}
    )
    assert doc_res_3.status_code == 200

    # Submission still blocked because food_product_category is missing
    partial_submit_res = client.post(
        f"/api/integrations/v1/applications/{app_number}/submit",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert partial_submit_res.status_code == 400
    assert "Food Product / Category Details" in partial_submit_res.json()["error"]["missing_documents"]

    # 8. Upload document 4: Food Product / Category Details
    dummy_pdf_4 = io.BytesIO(b"%PDF-1.4 Food Product & Category Spec Sheet")
    doc_res_4 = client.post(
        f"/api/integrations/v1/applications/{app_number}/documents",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY},
        data={"requirement_id": "food_product_category"},
        files={"file": ("food_product_details.pdf", dummy_pdf_4, "application/pdf")}
    )
    assert doc_res_4.status_code == 200

    # 9. Verify all 4 documents now show status UPLOADED
    doc_list_res2 = client.get(
        f"/api/v1/documents/application/{app_number}",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert doc_list_res2.status_code == 200
    for doc in doc_list_res2.json()["documents"]:
        assert doc["status"] == "UPLOADED"

    # 10. Submit Application via Integration API -> NOW SUCCEEDS
    submit_res = client.post(
        f"/api/integrations/v1/applications/{app_number}/submit",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["data"]["status"] == "SUBMITTED"

    # 11. Officer logs in and reviews application
    off_login = client.post("/api/v1/auth/login", json={
        "email": "officer.meena@fssai.gov.in",
        "password": "Officer123!"
    })
    officer_token = off_login.json()["data"]["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    # Officer moves application to UNDER_REVIEW
    status_res = client.post(
        f"/api/v1/officer/applications/{app_number}/status",
        headers=officer_headers,
        json={"new_status": "UNDER_REVIEW", "reason": "Officer started initial document scrutiny."}
    )
    assert status_res.status_code == 200
    assert status_res.json()["data"]["status"] == "UNDER_REVIEW"

    # 12. Officer reviews Document 1 (Identity Proof) -> ACCEPTED
    doc_id_1 = doc_res_1.json()["data"]["id"]
    rev_res_1 = client.post(
        f"/api/v1/officer/applications/{app_number}/documents/{doc_id_1}/review",
        headers=officer_headers,
        json={"review_status": "ACCEPTED", "officer_comment": "Valid Aadhaar card verified."}
    )
    assert rev_res_1.status_code == 200

    # 13. Officer reviews Document 2 (Address Proof) -> NEEDS_CORRECTION with mandatory comment
    doc_id_2 = doc_res_2.json()["data"]["id"]
    rev_res_2 = client.post(
        f"/api/v1/officer/applications/{app_number}/documents/{doc_id_2}/review",
        headers=officer_headers,
        json={
            "review_status": "NEEDS_CORRECTION",
            "officer_comment": "Uploaded address proof does not match the business address."
        }
    )
    assert rev_res_2.status_code == 200

    # 14. Officer reviews Document 3 (Passport Photo) -> ACCEPTED
    doc_id_3 = doc_res_3.json()["data"]["id"]
    rev_res_3 = client.post(
        f"/api/v1/officer/applications/{app_number}/documents/{doc_id_3}/review",
        headers=officer_headers,
        json={"review_status": "ACCEPTED", "officer_comment": "Clear photograph verified."}
    )
    assert rev_res_3.status_code == 200

    # 15. Officer reviews Document 4 (Food Product / Category) -> ACCEPTED
    doc_id_4 = doc_res_4.json()["data"]["id"]
    rev_res_4 = client.post(
        f"/api/v1/officer/applications/{app_number}/documents/{doc_id_4}/review",
        headers=officer_headers,
        json={"review_status": "ACCEPTED", "officer_comment": "Product category specifications confirmed."}
    )
    assert rev_res_4.status_code == 200

    # Check status sync shows DOCUMENT_QUERY and pending correction action
    sync_check = client.get(
        f"/api/integrations/v1/applications/{app_number}/status",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert sync_check.status_code == 200
    assert sync_check.json()["data"]["status"] == "DOCUMENT_QUERY"
    assert len(sync_check.json()["data"]["pending_actions"]) > 0

    # 16. Applicant logs in and replaces corrected Address Proof
    app_login = client.post("/api/v1/auth/login", json={
        "email": "rahul@example.com",
        "password": "Password123!"
    })
    app_token = app_login.json()["data"]["access_token"]
    app_headers = {"Authorization": f"Bearer {app_token}"}

    # Verify applicant sees officer comment
    app_detail = client.get(f"/api/v1/applicant/applications/{app_number}", headers=app_headers)
    assert app_detail.status_code == 200
    app_docs = app_detail.json()["data"]["documents"]
    addr_doc = next(d for d in app_docs if d["requirement_id"] == "address_proof")
    assert addr_doc["review_status"] == "NEEDS_CORRECTION"
    assert "Uploaded address proof does not match the business address." in addr_doc["officer_comment"]

    # Upload corrected Address Proof
    corrected_address_pdf = io.BytesIO(b"%PDF-1.4 Corrected electricity bill matching exact Salem unit address")
    up_res = client.post(
        f"/api/v1/documents/upload/{app_number}",
        headers=app_headers,
        data={"requirement_id": "address_proof"},
        files={"file": ("address_proof_corrected.pdf", corrected_address_pdf, "application/pdf")}
    )
    assert up_res.status_code == 200

    # 17. Officer marks newly uploaded address proof ACCEPTED and schedules inspection
    doc_id_corrected = up_res.json()["data"]["id"]
    client.post(
        f"/api/v1/officer/applications/{app_number}/documents/{doc_id_corrected}/review",
        headers=officer_headers,
        json={"review_status": "ACCEPTED", "officer_comment": "Address proof verified and matches business premises."}
    )

    insp_res = client.post(
        f"/api/v1/officer/applications/{app_number}/inspections",
        headers=officer_headers,
        json={
            "inspection_type": "Pre-Licensing Premises & Hygiene Inspection",
            "scheduled_date": "2026-10-05",
            "scheduled_time": "11:00 AM",
            "location": "Plot 42, SIDCO Industrial Estate, Salem, Tamil Nadu",
            "instructions": "Ensure safety logbooks and raw material batch records are accessible."
        }
    )
    assert insp_res.status_code == 200
    assert insp_res.json()["data"]["status"] == "SCHEDULED"

    # Status is now INSPECTION_SCHEDULED
    app_detail_post_insp = client.get(f"/api/v1/applicant/applications/{app_number}", headers=app_headers)
    assert app_detail_post_insp.json()["data"]["status"] == "INSPECTION_SCHEDULED"

    # 18. Officer completes inspection and APPROVES application
    client.post(
        f"/api/v1/officer/applications/{app_number}/status",
        headers=officer_headers,
        json={"new_status": "APPROVED", "reason": "All food hygiene and document requirements fully satisfied."}
    )

    # 19. Main SIH portal status sync check
    final_sync = client.get(
        f"/api/integrations/v1/applications/{app_number}/status",
        headers={"X-API-Key": settings.MOCK_FSSAI_API_KEY}
    )
    assert final_sync.status_code == 200
    assert final_sync.json()["data"]["status"] == "APPROVED"

    # 20. Acknowledgement PDF download
    ack_res = client.get(f"/api/v1/applicant/applications/{app_number}/acknowledgement", headers=app_headers)
    assert ack_res.status_code == 200
    assert ack_res.headers["content-type"] == "application/pdf"
    assert len(ack_res.content) > 100

def test_admin_officer_management_and_audit():
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@fssai.gov.in",
        "password": "Admin123!"
    })
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. List officers
    off_list = client.get("/api/v1/admin/officers", headers=admin_headers)
    assert off_list.status_code == 200
    assert len(off_list.json()["data"]) >= 1

    # 2. View audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    assert audit_res.json()["data"]["total"] >= 1

    # 3. View integration logs
    integ_logs = client.get("/api/v1/admin/integration-logs", headers=admin_headers)
    assert integ_logs.status_code == 200
