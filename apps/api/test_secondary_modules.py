"""
Comprehensive QA test script for Notifications, Calendar, Court Actions,
Notary, Email Tickets, and Case Review modules.

Run with: docker compose exec api python -c "exec(open('/app/test_secondary_modules.py').read())"
"""
import json
import sys
import traceback

import httpx

BASE = "http://localhost:8000/api/v1"
RESULTS = []


def log(test_name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append((test_name, status, detail))
    print(f"  [{status}] {test_name}" + (f"  -- {detail}" if detail else ""))


def login():
    resp = httpx.post(
        f"{BASE}/auth/login",
        data={"username": "admin@logan.cl", "password": "logan2024"},
    )
    if resp.status_code != 200:
        print(f"LOGIN FAILED: {resp.status_code} {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def safe_json(resp):
    try:
        return resp.json()
    except Exception:
        return None


# =====================================================================
# LOGIN
# =====================================================================
print("=" * 72)
print("Logging in...")
headers = login()
print("Login OK\n")


# =====================================================================
# 1. NOTIFICATIONS
# =====================================================================
print("=" * 72)
print("1. NOTIFICATIONS MODULE")
print("=" * 72)

# 1a. GET /notifications/
resp = httpx.get(f"{BASE}/notifications/", headers=headers)
data = safe_json(resp)
log(
    "GET /notifications/ returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "GET /notifications/ returns a list",
    isinstance(data, list),
    f"type={type(data).__name__}, sample={str(data)[:200] if data else 'None'}",
)

# Check list item shape if any items
if isinstance(data, list) and len(data) > 0:
    item = data[0]
    expected_keys = {"id", "type", "title", "message", "entity_type", "entity_id", "read", "created_at"}
    actual_keys = set(item.keys())
    missing = expected_keys - actual_keys
    log(
        "Notification item has expected keys",
        len(missing) == 0,
        f"missing={missing}" if missing else f"keys={sorted(actual_keys)}",
    )
else:
    log("Notification list has items", False, "empty list - cannot verify shape")

# 1b. GET /notifications/unread-count
resp = httpx.get(f"{BASE}/notifications/unread-count", headers=headers)
data = safe_json(resp)
log(
    "GET /notifications/unread-count returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "unread-count response has 'unread_count' key",
    isinstance(data, dict) and "unread_count" in data,
    f"data={data}",
)

# 1c. Check: does POST /notifications/ (create) exist as an endpoint?
# The router DOES NOT have a POST / create endpoint - only the service has create_notification()
resp = httpx.post(f"{BASE}/notifications/", headers=headers, json={})
log(
    "POST /notifications/ (create) endpoint exists?",
    resp.status_code != 405 and resp.status_code != 404,
    f"status={resp.status_code} - {'YES' if resp.status_code not in (404, 405) else 'NO, not exposed as API'}",
)

# 1d. PATCH /notifications/{id}/read - does mark-as-read work?
# Router uses POST /{notification_id}/read, NOT PATCH
resp_patch = httpx.patch(f"{BASE}/notifications/1/read", headers=headers)
resp_post = httpx.post(f"{BASE}/notifications/1/read", headers=headers)
log(
    "PATCH /notifications/{id}/read works?",
    resp_patch.status_code == 200,
    f"PATCH status={resp_patch.status_code} (router uses POST, not PATCH)",
)
log(
    "POST /notifications/{id}/read works?",
    resp_post.status_code in (200, 404),
    f"status={resp_post.status_code}, body={str(safe_json(resp_post))[:200]}",
)

# 1e. POST /notifications/read-all
resp = httpx.post(f"{BASE}/notifications/read-all", headers=headers)
data = safe_json(resp)
log(
    "POST /notifications/read-all returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}, data={data}",
)

# 1f. Frontend mismatch: notifications page calls /agent-logs, NOT /notifications/
print("\n  --- FRONTEND ANALYSIS ---")
log(
    "FRONTEND MISMATCH: notifications/page.tsx calls /agent-logs NOT /notifications/",
    False,
    "Page fetches api.get('/agent-logs') but backend has /notifications/ endpoints",
)

# 1g. Topbar: calls /notifications/unread-count
# But it reads notifData?.count instead of notifData?.unread_count
log(
    "TOPBAR MISMATCH: reads 'count' from unread-count response, backend returns 'unread_count'",
    False,
    "topbar.tsx line 63: notifData?.count but API returns {unread_count: N}",
)

# Verify this by checking what the API actually returns
resp = httpx.get(f"{BASE}/notifications/unread-count", headers=headers)
data = safe_json(resp)
has_count = isinstance(data, dict) and "count" in data
has_unread_count = isinstance(data, dict) and "unread_count" in data
log(
    "API /notifications/unread-count field name",
    has_unread_count and not has_count,
    f"has 'count'={has_count}, has 'unread_count'={has_unread_count}, data={data}",
)


# =====================================================================
# 2. CALENDAR
# =====================================================================
print("\n" + "=" * 72)
print("2. CALENDAR MODULE")
print("=" * 72)

# 2a. GET /calendar/events
resp = httpx.get(f"{BASE}/calendar/events", headers=headers)
data = safe_json(resp)
log(
    "GET /calendar/events returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "GET /calendar/events returns a list",
    isinstance(data, list),
    f"type={type(data).__name__}, count={len(data) if isinstance(data, list) else 'N/A'}",
)

# Check event shape
if isinstance(data, list) and len(data) > 0:
    ev = data[0]
    expected_keys = {"id", "title", "date", "time", "type", "location", "matterId", "color"}
    actual_keys = set(ev.keys())
    missing = expected_keys - actual_keys
    log(
        "Calendar event has expected keys",
        len(missing) == 0,
        f"missing={missing}" if missing else f"keys={sorted(actual_keys)}",
    )
    # Verify types match frontend expectations
    log(
        "Event 'id' is string (frontend expects string)",
        isinstance(ev.get("id"), str),
        f"id type={type(ev.get('id')).__name__}, value={ev.get('id')}",
    )
else:
    log("Calendar events list has items", len(data) > 0 if isinstance(data, list) else False,
        "empty list - OK if no data, cannot verify shape")

# 2b. No create/update calendar endpoints
resp_post = httpx.post(f"{BASE}/calendar/events", headers=headers, json={})
log(
    "POST /calendar/events endpoint exists?",
    resp_post.status_code not in (404, 405),
    f"status={resp_post.status_code} - {'YES' if resp_post.status_code not in (404, 405) else 'NO, read-only module'}",
)

# 2c. Frontend expects CalendarEvent[] directly (no wrapper)
print("\n  --- FRONTEND ANALYSIS ---")
log(
    "Frontend calendar/page.tsx expects CalendarEvent[] from /calendar/events",
    True,
    "Backend returns list directly - MATCH",
)

# Calendar service uses start/end query params
resp = httpx.get(f"{BASE}/calendar/events?start=2025-01-01&end=2025-12-31", headers=headers)
log(
    "GET /calendar/events with start/end params returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)

# 2d. The tarea type is returned but frontend only has audiencia, reunion, plazo, seguimiento in TYPE_BADGE
# Calendar service returns type="tarea" for tasks, but frontend TYPE_BADGE doesn't have it
log(
    "FRONTEND: TYPE_BADGE missing 'tarea' type",
    False,
    "Calendar service returns type='tarea' for tasks, but frontend only has audiencia/reunion/plazo/seguimiento",
)


# =====================================================================
# 3. COURT ACTIONS
# =====================================================================
print("\n" + "=" * 72)
print("3. COURT ACTIONS MODULE")
print("=" * 72)

# 3a. GET /court-actions/
resp = httpx.get(f"{BASE}/court-actions/", headers=headers)
data = safe_json(resp)
log(
    "GET /court-actions/ returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)

# Response should be CourtActionListResponse (has items + total)
is_list_resp = isinstance(data, dict) and "items" in data and "total" in data
log(
    "GET /court-actions/ returns {items, total} shape",
    is_list_resp,
    f"keys={sorted(data.keys()) if isinstance(data, dict) else type(data).__name__}, sample={str(data)[:200]}",
)

# Check item shape
if is_list_resp and len(data.get("items", [])) > 0:
    item = data["items"][0]
    log(
        "Court action item has id, status, action_type",
        all(k in item for k in ("id", "status", "action_type")),
        f"keys={sorted(item.keys())}",
    )

# 3b. Frontend page does NOT exist
log(
    "FRONTEND: No court-actions page exists",
    False,
    "No apps/web/src/app/(dashboard)/court-actions/page.tsx found",
)


# =====================================================================
# 4. NOTARY
# =====================================================================
print("\n" + "=" * 72)
print("4. NOTARY MODULE")
print("=" * 72)

# 4a. GET /notary/
resp = httpx.get(f"{BASE}/notary/", headers=headers)
data = safe_json(resp)
log(
    "GET /notary/ returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "GET /notary/ returns a list",
    isinstance(data, list),
    f"type={type(data).__name__}, count={len(data) if isinstance(data, list) else 'N/A'}",
)

# Check item shape matches frontend NotaryDoc interface
if isinstance(data, list) and len(data) > 0:
    item = data[0]
    expected_keys = {"id", "document_type", "title", "client_name", "notary_name", "status", "submitted_date", "created_at", "process_id"}
    actual_keys = set(item.keys())
    missing = expected_keys - actual_keys
    log(
        "Notary item matches frontend NotaryDoc interface",
        len(missing) == 0,
        f"missing={missing}" if missing else f"keys={sorted(actual_keys)}",
    )
else:
    log("Notary list has items", False, "empty list - cannot verify shape")

# 4b. GET /notary/stats
resp = httpx.get(f"{BASE}/notary/stats", headers=headers)
data = safe_json(resp)
log(
    "GET /notary/stats returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}, data={data}",
)

# Frontend calls /notary (without trailing slash) - check
resp2 = httpx.get(f"{BASE}/notary", headers=headers)
log(
    "GET /notary (no trailing slash) also works",
    resp2.status_code == 200,
    f"status={resp2.status_code}",
)


# =====================================================================
# 5. EMAIL TICKETS
# =====================================================================
print("\n" + "=" * 72)
print("5. EMAIL TICKETS MODULE")
print("=" * 72)

# 5a. GET /email-tickets/
resp = httpx.get(f"{BASE}/email-tickets/", headers=headers)
data = safe_json(resp)
log(
    "GET /email-tickets/ returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "GET /email-tickets/ returns a list",
    isinstance(data, list),
    f"type={type(data).__name__}, count={len(data) if isinstance(data, list) else 'N/A'}",
)

# Check item shape matches frontend EmailTicket interface
if isinstance(data, list) and len(data) > 0:
    item = data[0]
    expected_keys = {"id", "subject", "from_email", "from_name", "status", "priority", "assigned_to_name", "created_at", "process_id"}
    actual_keys = set(item.keys())
    missing = expected_keys - actual_keys
    log(
        "Email ticket item matches frontend EmailTicket interface",
        len(missing) == 0,
        f"missing={missing}" if missing else f"keys={sorted(actual_keys)}",
    )
else:
    log("Email tickets list has items", False, "empty list - cannot verify shape")

# 5b. GET /email-tickets/stats
resp = httpx.get(f"{BASE}/email-tickets/stats", headers=headers)
data = safe_json(resp)
log(
    "GET /email-tickets/stats returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}, data={data}",
)

# 5c. Detail page mutation uses PATCH for transitions but router has POST /transition
print("\n  --- FRONTEND ANALYSIS ---")
log(
    "FRONTEND MISMATCH: email-tickets/[id]/page.tsx uses api.patch() for transitions",
    False,
    "Detail page line 63: api.patch(`/email-tickets/${ticketId}`, { action }) but backend expects POST /email-tickets/{id}/transition with {action}",
)


# =====================================================================
# 6. CASE REVIEW
# =====================================================================
print("\n" + "=" * 72)
print("6. CASE REVIEW MODULE")
print("=" * 72)

# 6a. GET /case-review/open-matters
resp = httpx.get(f"{BASE}/case-review/open-matters", headers=headers)
data = safe_json(resp)
log(
    "GET /case-review/open-matters returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)

# Backend returns {items: [...], total: N}
is_list_resp = isinstance(data, dict) and "items" in data and "total" in data
log(
    "GET /case-review/open-matters returns {items, total}",
    is_list_resp,
    f"data type={type(data).__name__}, keys={sorted(data.keys()) if isinstance(data, dict) else 'N/A'}",
)

# 6b. Frontend expects Matter[] directly from the API
print("\n  --- FRONTEND ANALYSIS ---")
log(
    "FRONTEND MISMATCH: case-review/page.tsx expects Matter[] from /case-review/open-matters",
    False,
    "Page line 141: api.get<Matter[]>('/case-review/open-matters') but backend returns {items: [...], total: N}",
)

# Check item shape
if is_list_resp and len(data.get("items", [])) > 0:
    item = data["items"][0]
    expected = {"id", "title", "court", "rol_number", "client_name", "status", "last_movement_at", "assigned_to"}
    actual = set(item.keys())
    missing = expected - actual
    log(
        "Case review matter item has expected keys",
        len(missing) == 0,
        f"missing={missing}" if missing else f"keys={sorted(actual)}",
    )

# 6c. Does /case-review/ root exist?
resp = httpx.get(f"{BASE}/case-review/", headers=headers)
log(
    "GET /case-review/ root endpoint",
    resp.status_code != 404,
    f"status={resp.status_code} - {'exists' if resp.status_code != 404 else 'NOT FOUND'}",
)


# =====================================================================
# 7. AGENT LOGS (used by notifications frontend page)
# =====================================================================
print("\n" + "=" * 72)
print("7. AGENT LOGS MODULE (called by notifications page)")
print("=" * 72)

resp = httpx.get(f"{BASE}/agent-logs", headers=headers)
data = safe_json(resp)
log(
    "GET /agent-logs returns 200",
    resp.status_code == 200,
    f"status={resp.status_code}",
)
log(
    "GET /agent-logs returns a list",
    isinstance(data, list),
    f"type={type(data).__name__}, count={len(data) if isinstance(data, list) else 'N/A'}",
)

if isinstance(data, list) and len(data) > 0:
    item = data[0]
    # Frontend expects AgentLogEntry with: agentName, action, status, timestamp, actionRequired, detail, entityType
    expected = {"agentName", "action", "status", "timestamp"}
    actual = set(item.keys())
    missing = expected - actual
    log(
        "Agent log entry has expected keys for frontend",
        len(missing) == 0,
        f"missing={missing}, actual_keys={sorted(actual)}",
    )


# =====================================================================
# SUMMARY
# =====================================================================
print("\n" + "=" * 72)
print("SUMMARY")
print("=" * 72)

total = len(RESULTS)
passed = sum(1 for _, s, _ in RESULTS if s == "PASS")
failed = sum(1 for _, s, _ in RESULTS if s == "FAIL")

print(f"\nTotal tests: {total}")
print(f"PASSED: {passed}")
print(f"FAILED: {failed}")

if failed > 0:
    print("\n--- FAILURES ---")
    for name, status, detail in RESULTS:
        if status == "FAIL":
            print(f"  [FAIL] {name}")
            print(f"         {detail}")

print("\n--- ALL ISSUES FOUND ---")
issues = [
    (
        "CRITICAL",
        "Notifications page frontend-backend disconnect",
        "notifications/page.tsx calls api.get('/agent-logs') instead of /notifications/. "
        "The actual /notifications/ endpoints are never used by the frontend page.",
    ),
    (
        "CRITICAL",
        "Topbar notification badge reads wrong key",
        "topbar.tsx reads notifData?.count but API /notifications/unread-count returns {unread_count: N}. "
        "Badge will always show 0.",
    ),
    (
        "CRITICAL",
        "Case review frontend expects array, backend returns {items, total}",
        "case-review/page.tsx does api.get<Matter[]>('/case-review/open-matters') but backend returns "
        "{items: [...], total: N}. The page will crash or show no data.",
    ),
    (
        "MEDIUM",
        "Email ticket detail page uses wrong HTTP method for transitions",
        "email-tickets/[id]/page.tsx uses api.patch() for transitions but backend has "
        "POST /email-tickets/{id}/transition. The mutation will fail.",
    ),
    (
        "LOW",
        "Calendar frontend missing 'tarea' type badge",
        "Calendar service returns type='tarea' for tasks but frontend TYPE_BADGE only has "
        "audiencia/reunion/plazo/seguimiento. Task events will have no type badge.",
    ),
    (
        "LOW",
        "No court-actions frontend page",
        "Backend has full CRUD at /court-actions/ but no frontend page exists at "
        "apps/web/src/app/(dashboard)/court-actions/page.tsx.",
    ),
    (
        "INFO",
        "POST /notifications/ (create) is not exposed as an API endpoint",
        "The notifications service has create_notification() function but no POST endpoint. "
        "Notifications are created only internally by agents/tools.",
    ),
    (
        "INFO",
        "Notification mark-as-read uses POST not PATCH",
        "Router defines POST /{id}/read, not PATCH. Frontend or other clients trying PATCH will get 405.",
    ),
    (
        "INFO",
        "Calendar is read-only",
        "No create/update/delete endpoints for calendar events. Events are derived from "
        "deadlines, tasks, court actions, and proposals.",
    ),
]

for severity, title, description in issues:
    print(f"\n  [{severity}] {title}")
    print(f"    {description}")

print("\nDone.")
