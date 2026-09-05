import os
import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# ------------------------------------------------------------------
# Shared test data
# ------------------------------------------------------------------

TEST_PASSWORD = "Test@12345"

TOKEN = None

BUSINESS_NEED_ID = None
PR_ID = None


# ------------------------------------------------------------------
# Common helper functions
# ------------------------------------------------------------------

def headers():
    assert TOKEN is not None, "Login token was not created"

    return {
        "Authorization": f"Bearer {TOKEN}"
    }


def response_data(response):
    try:
        data = response.json()

        if isinstance(data, dict):
            return data

        return {}

    except Exception:
        return {}


def extract_id(data, *keys):
    """
    Extract an ID from a response using multiple possible field names.
    """

    if not isinstance(data, dict):
        return None

    for key in keys:
        value = data.get(key)

        if value is not None:
            return value

    return None


def assert_valid_dependency(value, name):
    assert value is not None, (
        f"{name} was not created. "
        "The previous dependent test must pass first."
    )


def get_business_need_type_id():
    """
    Return the active Business Need Type ID used by the test database.

    Change this value to the actual active ID in your database.
    """

    business_need_type_id = 1

    assert business_need_type_id > 0, (
        "Business Need Type ID must be greater than zero."
    )

    return business_need_type_id


# ------------------------------------------------------------------
# TC01 - Register and login
# ------------------------------------------------------------------

def test_tc01_register_and_login():
    global TOKEN

    username = f"qa_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"

    register_response = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": email,
            "password": TEST_PASSWORD,
        },
    )

    assert register_response.status_code in [200, 201, 400], (
        f"Registration failed: {register_response.text}"
    )

    login_response = client.post(
        "/auth/login",
        json={
            "username": username,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200, (
        f"Login failed: {login_response.text}"
    )

    data = response_data(login_response)

    TOKEN = data.get("access_token")

    assert TOKEN is not None, (
        f"Access token was not returned: {data}"
    )


# ------------------------------------------------------------------
# TC02 - Create and submit Business Need
# ------------------------------------------------------------------

def test_tc02_create_and_submit_business_need():
    global BUSINESS_NEED_ID

    business_need_type_id = get_business_need_type_id()

    create_response = client.post(
        "/business-needs/",
        json={
            "title": "Office Fit-Out",
            "business_need_type_id": business_need_type_id,
            "description": "Automated workflow test",
        },
        headers=headers(),
    )

    assert create_response.status_code in [200, 201], (
        "Business Need creation failed: "
        f"{create_response.text}"
    )

    data = response_data(create_response)

    BUSINESS_NEED_ID = extract_id(
        data,
        "id",
        "business_need_id",
    )

    assert BUSINESS_NEED_ID is not None, (
        f"Business Need ID missing: {data}"
    )

    submit_response = client.post(
        f"/business-needs/{BUSINESS_NEED_ID}/submit",
        headers=headers(),
    )

    assert submit_response.status_code in [200, 201], (
        "Business Need submission failed: "
        f"{submit_response.text}"
    )


# ------------------------------------------------------------------
# TC03 - Create, submit and approve Purchase Requisition
# ------------------------------------------------------------------

def test_tc03_create_submit_approve_pr():
    global PR_ID

    assert_valid_dependency(
        BUSINESS_NEED_ID,
        "BUSINESS_NEED_ID",
    )

    create_response = client.post(
        "/purchase-requisitions/",
        json={
            "business_need_id": BUSINESS_NEED_ID,
            "title": "Office Fit-Out Purchase Requisition",
            "description": "Automated workflow test",
            "line_items": [
                {
                    "description": "Office fit-out work",
                    "quantity": 1,
                    "unit_price": 19992.08,
                }
            ],
        },
        headers=headers(),
    )

    assert create_response.status_code in [200, 201], (
        f"PR creation failed: {create_response.text}"
    )

    data = response_data(create_response)

    PR_ID = extract_id(
        data,
        "id",
        "pr_id",
        "purchase_requisition_id",
    )

    assert PR_ID is not None, (
        f"PR ID missing: {data}"
    )

    submit_response = client.post(
        f"/purchase-requisitions/{PR_ID}/submit",
        headers=headers(),
    )

    assert submit_response.status_code in [200, 201], (
        f"PR submission failed: {submit_response.text}"
    )

    approve_response = client.post(
        f"/purchase-requisitions/{PR_ID}/approve",
        json={
            "remarks": (
                "Purchase requisition approved for "
                "automated workflow testing"
            ),
        },
        headers=headers(),
    )

    assert approve_response.status_code in [200, 201], (
        f"PR approval failed: {approve_response.text}"
    )


# ------------------------------------------------------------------
# TC07 - Verify unauthorized access
# ------------------------------------------------------------------

def test_tc07_unauthorized_access():
    """
    Verify protected API rejects unauthenticated requests.
    """

    response = client.get("/business-needs")

    assert response.status_code in [401, 403], (
        f"Expected unauthorized response, got "
        f"{response.status_code}: {response.text}"
    )


# ------------------------------------------------------------------
# TC08 - Verify invalid Business Need request
# ------------------------------------------------------------------

def test_tc08_invalid_business_need_request():
    """
    Verify invalid Business Need request validation.
    """

    response = client.post(
        "/business-needs",
        json={},
        headers=headers(),
    )

    assert response.status_code == 422, (
        f"Expected validation error 422, got "
        f"{response.status_code}: {response.text}"
    )