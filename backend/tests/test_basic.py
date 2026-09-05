import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
TEST_PASSWORD = "Test@12345"


def assert_status(response, expected_status: int):
    assert response.status_code == expected_status, (
        f"Expected HTTP {expected_status}, got {response.status_code}: "
        f"{response.text}"
    )
    return response.json()


def register_user():
    username = f"workflow_{uuid.uuid4().hex}"
    response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": TEST_PASSWORD,
        },
    )
    assert_status(response, 200)
    return username


def login_user(username: str):
    response = client.post(
        "/auth/login",
        json={
            "username": username,
            "password": TEST_PASSWORD,
        },
    )
    data = assert_status(response, 200)
    token = data.get("access_token")
    assert isinstance(token, str) and token, (
        f"Login did not return an access token: {data}"
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers():
    return login_user(register_user())


@pytest.fixture
def business_need(auth_headers):
    types_response = client.get(
        "/business-needs/types",
        headers=auth_headers,
    )
    assert types_response.status_code == 200, types_response.text
    types = types_response.json()
    assert isinstance(types, list) and types, "No active Business Need types returned"

    response = client.post(
        "/business-needs/",
        json={
            "business_need_type_id": types[0]["id"],
            "title": f"Workflow test {uuid.uuid4().hex[:8]}",
            "description": "End-to-end API workflow test",
            "department": "Engineering",
            "estimated_value": 2500,
            "currency": "USD",
        },
        headers=auth_headers,
    )
    data = assert_status(response, 201)
    assert data["status"] == "Draft"
    return data


@pytest.fixture
def submitted_business_need(auth_headers, business_need):
    response = client.post(
        f"/business-needs/{business_need['id']}/submit",
        headers=auth_headers,
    )
    data = assert_status(response, 200)
    assert data["status"] == "Submitted"
    return data


@pytest.fixture
def submitted_pr(auth_headers, submitted_business_need):
    response = client.post(
        "/purchase-requisitions/",
        json={
            "business_need_id": submitted_business_need["id"],
            "title": "Workflow test purchase requisition",
            "justification": "Created from the submitted Business Need",
            "line_items": [
                {
                    "description": "Workflow test equipment",
                    "quantity": 2,
                    "unit_price": 1250,
                }
            ],
        },
        headers=auth_headers,
    )
    pr_data = assert_status(response, 201)
    assert pr_data["status"] == "Draft"
    assert pr_data["total_amount"] == 2500

    response = client.post(
        f"/purchase-requisitions/{pr_data['id']}/submit",
        headers=auth_headers,
    )
    submitted_data = assert_status(response, 200)
    assert submitted_data["status"] == "Submitted"
    return submitted_data


def test_register_and_login():
    username = register_user()
    headers = login_user(username)

    response = client.get("/auth/me", headers=headers)
    data = assert_status(response, 200)
    assert data["username"] == username


def test_list_active_business_need_types(auth_headers):
    response = client.get(
        "/business-needs/types",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    types = response.json()
    assert isinstance(types, list) and types
    assert all(type_data["is_active"] for type_data in types)


def test_create_business_need(auth_headers, business_need):
    assert business_need["id"] > 0
    assert business_need["need_number"].startswith("BN-")
    assert business_need["status"] == "Draft"
    assert business_need["currency"] == "USD"


def test_submit_business_need(auth_headers, submitted_business_need):
    assert submitted_business_need["id"] > 0
    assert submitted_business_need["status"] == "Submitted"


def test_create_and_submit_purchase_requisition(
    auth_headers,
    submitted_pr,
):
    assert submitted_pr["id"] > 0
    assert submitted_pr["pr_number"].startswith("PR-")
    assert submitted_pr["status"] == "Submitted"
    assert submitted_pr["total_amount"] == 2500
    assert len(submitted_pr["line_items"]) == 1


def test_approve_purchase_requisition(auth_headers, submitted_pr):
    response = client.post(
        f"/purchase-requisitions/{submitted_pr['id']}/approve",
        json={"remarks": "Approved by the workflow integration test"},
        headers=auth_headers,
    )
    approved_pr = assert_status(response, 200)

    assert approved_pr["id"] == submitted_pr["id"]
    assert approved_pr["status"] == "Approved"
    assert len(approved_pr["approvals"]) == 1
    assert approved_pr["approvals"][0]["decision"] == "Approved"
    assert approved_pr["approvals"][0]["remarks"] == (
        "Approved by the workflow integration test"
    )
