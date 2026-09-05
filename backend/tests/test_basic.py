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

PO_ID = None
PO_NUMBER = None
PO_LINE_ID = None


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


def extract_po_line_id(data):
    """
    Extract the purchase-order line ID from different possible
    purchase-order response structures.
    """

    if not isinstance(data, dict):
        return None

    possible_collections = [
        data.get("line_items"),
        data.get("items"),
        data.get("purchase_order_lines"),
        data.get("lines"),
    ]

    for collection in possible_collections:
        if not isinstance(collection, list):
            continue

        for item in collection:
            if not isinstance(item, dict):
                continue

            line_id = extract_id(
                item,
                "id",
                "purchase_order_line_id",
                "line_id",
            )

            if line_id is not None:
                return line_id

    return None


def assert_valid_dependency(value, name):
    assert value is not None, (
        f"{name} was not created. "
        "The previous dependent test must pass first."
    )


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

    create_response = client.post(
        "/business-needs/",
        json={
            "title": "Office Fit-Out",
            "business_need_type_id": 1,
            "description": "Automated workflow test",
        },
        headers=headers(),
    )

    assert create_response.status_code in [200, 201], (
        f"Business Need creation failed: "
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
        f"Business Need submission failed: "
        f"{submit_response.text}"
    )


# ------------------------------------------------------------------
# TC03 - Create, submit and approve Purchase Requisition
# ------------------------------------------------------------------

def test_tc03_create_submit_approve_pr():
    global PR_ID

    assert BUSINESS_NEED_ID is not None, (
        "BUSINESS_NEED_ID was not created"
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
# TC04 - Select vendor and record negotiation
# ------------------------------------------------------------------

def test_tc04_select_vendor_and_negotiation():
    assert PR_ID is not None, (
        "PR_ID was not created"
    )

    vendor_response = client.post(
        f"/purchase-requisitions/{PR_ID}/select-vendor",
        json={
            "vendor_name": "REDEFINE PROPERTIES",
        },
        headers=headers(),
    )

    assert vendor_response.status_code in [200, 201], (
        f"Vendor selection failed: "
        f"{vendor_response.text}"
    )

    negotiation_response = client.post(
        f"/purchase-requisitions/{PR_ID}/negotiation",
        json={
            "negotiated_amount": 19992.08,
            "remarks": "Vendor price and terms confirmed",
        },
        headers=headers(),
    )

    assert negotiation_response.status_code in [200, 201], (
        f"Negotiation failed: "
        f"{negotiation_response.text}"
    )


# ------------------------------------------------------------------
# TC05 - Create, submit, approve, send and acknowledge PO
# ------------------------------------------------------------------

def test_tc05_create_submit_approve_po():
    global PO_ID
    global PO_NUMBER
    global PO_LINE_ID

    assert PR_ID is not None, (
        "PR_ID was not created"
    )

    # --------------------------------------------------------------
    # Create PO
    # --------------------------------------------------------------

    create_response = client.post(
        f"/purchase-orders/from-pr/{PR_ID}",
        headers=headers(),
    )

    assert create_response.status_code in [200, 201], (
        f"PO creation failed: {create_response.text}"
    )

    create_data = response_data(create_response)

    print("PO CREATE RESPONSE:", create_data)

    PO_ID = extract_id(
        create_data,
        "id",
        "po_id",
        "purchase_order_id",
    )

    PO_NUMBER = (
        create_data.get("po_number")
        or create_data.get("purchase_order_number")
        or create_data.get("number")
    )

    assert PO_ID is not None, (
        f"PO ID missing: {create_data}"
    )

    assert PO_NUMBER is not None, (
        f"PO number missing: {create_data}"
    )

    PO_LINE_ID = extract_po_line_id(create_data)

    # --------------------------------------------------------------
    # Submit PO
    # Created -> Approval Pending
    # --------------------------------------------------------------

    submit_response = client.post(
        f"/purchase-orders/{PO_ID}/submit",
        headers=headers(),
    )

    assert submit_response.status_code in [200, 201], (
        f"PO submission failed: {submit_response.text}"
    )

    # --------------------------------------------------------------
    # Approve PO
    # Approval Pending -> Approved
    # --------------------------------------------------------------

    approve_response = client.post(
        f"/purchase-orders/{PO_ID}/approve",
        json={
            "remarks": (
                "Purchase order approved for "
                "automated workflow testing"
            ),
        },
        headers=headers(),
    )

    assert approve_response.status_code in [200, 201], (
        f"PO approval failed: {approve_response.text}"
    )

    approve_data = response_data(approve_response)

    print("PO APPROVAL RESPONSE:", approve_data)

    if PO_LINE_ID is None:
        PO_LINE_ID = extract_po_line_id(approve_data)

    # --------------------------------------------------------------
    # Send PO to vendor
    # Approved -> Sent
    # --------------------------------------------------------------

    send_response = client.post(
        f"/purchase-orders/{PO_ID}/send-to-vendor",
        headers=headers(),
    )

    assert send_response.status_code in [200, 201], (
        f"PO send to vendor failed: "
        f"{send_response.text}"
    )

    send_data = response_data(send_response)

    print("PO SEND RESPONSE:", send_data)

    if PO_LINE_ID is None:
        PO_LINE_ID = extract_po_line_id(send_data)

    # --------------------------------------------------------------
    # Vendor accepts PO
    # Sent -> Acknowledged
    # --------------------------------------------------------------

    vendor_accept_response = client.post(
        f"/purchase-orders/{PO_ID}/vendor-accept",
        json={
            "remarks": "Vendor accepted the purchase order"
        },
        headers=headers(),
    )

    assert vendor_accept_response.status_code in [200, 201], (
        f"Vendor acceptance failed: "
        f"{vendor_accept_response.text}"
    )

    vendor_accept_data = response_data(
        vendor_accept_response
    )

    print(
        "VENDOR ACCEPTANCE RESPONSE:",
        vendor_accept_data,
    )

    if PO_LINE_ID is None:
        PO_LINE_ID = extract_po_line_id(
            vendor_accept_data
        )

    # --------------------------------------------------------------
    # Get PO details if line ID was not returned earlier
    # --------------------------------------------------------------

    if PO_LINE_ID is None:
        po_details_response = client.get(
            f"/purchase-orders/{PO_NUMBER}",
            headers=headers(),
        )

        print(
            "PO DETAILS RESPONSE:",
            po_details_response.text,
        )

        assert po_details_response.status_code == 200, (
            f"PO details failed: "
            f"{po_details_response.text}"
        )

        po_details = response_data(
            po_details_response
        )

        PO_LINE_ID = extract_po_line_id(po_details)

    assert PO_LINE_ID is not None, (
        "PO_LINE_ID was not returned by the "
        "purchase-order API."
    )

    print("PO_ID:", PO_ID)
    print("PO_NUMBER:", PO_NUMBER)
    print("PO_LINE_ID:", PO_LINE_ID)


# ------------------------------------------------------------------
# TC06 - Create, submit and accept Goods Receipt
# ------------------------------------------------------------------

def test_tc06_goods_receipt():
    assert_valid_dependency(PO_ID, "PO_ID")
    assert_valid_dependency(PO_LINE_ID, "PO_LINE_ID")

    # --------------------------------------------------------------
    # Create Goods Receipt
    # Requires PO status = Acknowledged
    # --------------------------------------------------------------

    create_response = client.post(
        "/goods-receipts/",
        json={
            "purchase_order_id": PO_ID,
            "delivery_status": "Delivered",
            "line_items": [
                {
                    "purchase_order_line_id": PO_LINE_ID,
                    "description": "Office fit-out work",
                    "ordered_quantity": 1,
                    "received_quantity": 1,
                    "accepted_quantity": 1,
                }
            ],
        },
        headers=headers(),
    )

    assert create_response.status_code in [200, 201], (
        f"Goods Receipt creation failed: "
        f"{create_response.text}"
    )

    data = response_data(create_response)

    receipt_id = extract_id(
        data,
        "id",
        "receipt_id",
        "goods_receipt_id",
    )

    assert receipt_id is not None, (
        f"Goods Receipt ID missing: {data}"
    )

    # --------------------------------------------------------------
    # Submit Goods Receipt
    # --------------------------------------------------------------

    submit_response = client.post(
        f"/goods-receipts/{receipt_id}/submit",
        headers=headers(),
    )

    assert submit_response.status_code in [200, 201], (
        f"Goods Receipt submission failed: "
        f"{submit_response.text}"
    )

    # --------------------------------------------------------------
    # Accept Goods Receipt
    # --------------------------------------------------------------

    accept_response = client.post(
        f"/goods-receipts/{receipt_id}/accept",
        json={
            "remarks": "Goods received and accepted"
        },
        headers=headers(),
    )

    assert accept_response.status_code in [200, 201], (
        f"Goods Receipt acceptance failed: "
        f"{accept_response.text}"
    )

def test_tc07_unauthorized_access():
    """TC07 - Verify protected API rejects unauthenticated requests."""

    response = client.get("/business-needs")

    assert response.status_code in [401, 403], (
        f"Expected unauthorized response, got {response.status_code}: "
        f"{response.text}"
    )

def test_tc08_invalid_business_need_request():
    """TC08 - Verify invalid business need request validation."""

    response = client.post(
        "/business-needs",
        json={},
        headers=headers(),
    )

    assert response.status_code == 422, (
        f"Expected validation error 422, got {response.status_code}: "
        f"{response.text}"
    )