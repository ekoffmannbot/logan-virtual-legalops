"""Full QA test script for Logan Virtual API."""
import json
import sys
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import HTTPError

API = "http://localhost:8000/api/v1"
ERRORS = []
PASS = []


def login():
    data = urlencode({"username": "admin@logan.cl", "password": "logan2024"}).encode()
    r = Request(
        API + "/auth/login",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    resp = urlopen(r)
    return json.loads(resp.read().decode())


def api_req(method, path, token, body=None):
    headers = {"Authorization": "Bearer " + token}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    r = Request(API + path, data=data, headers=headers, method=method)
    try:
        resp = urlopen(r)
        raw = resp.read().decode()
        return resp.status, json.loads(raw) if raw.strip() else {}
    except HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        try:
            detail = json.loads(raw)
        except Exception:
            detail = raw
        return e.code, detail


def t(name, method, path, token, body=None, expect=200):
    status, data = api_req(method, path, token, body)
    if status == expect:
        PASS.append(name)
        return data
    else:
        detail = str(data)[:250]
        ERRORS.append(f"{name}: {method} {path} -> {status} (expected {expect}) | {detail}")
        return None


def main():
    # ═════════════════════════════════════════════════════════════
    # 1. AUTH
    # ═════════════════════════════════════════════════════════════
    print("Testing AUTH...")
    login_data = login()
    token = login_data["access_token"]
    PASS.append("Auth: Login OK")

    me = t("Auth: GET /me", "GET", "/auth/me", token)
    if me:
        assert me["email"] == "admin@logan.cl"
        assert me["role"] == "gerente_legal"
        PASS.append("Auth: /me correct user data")

    t("Auth: Refresh", "POST", "/auth/refresh", token, {"refresh_token": login_data["refresh_token"]})

    # Wrong password
    try:
        d2 = urlencode({"username": "admin@logan.cl", "password": "wrong"}).encode()
        urlopen(Request(API + "/auth/login", data=d2, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST"))
        ERRORS.append("Auth: Wrong password should return 401")
    except HTTPError as e:
        if e.code == 401:
            PASS.append("Auth: Wrong password -> 401")
        else:
            ERRORS.append(f"Auth: Wrong password -> {e.code}")

    # No auth
    try:
        urlopen(Request(API + "/auth/me"))
        ERRORS.append("Auth: No token should return 401")
    except HTTPError as e:
        if e.code == 401:
            PASS.append("Auth: No token -> 401")
        else:
            ERRORS.append(f"Auth: No token -> {e.code}")

    # ═════════════════════════════════════════════════════════════
    # 2. DASHBOARD
    # ═════════════════════════════════════════════════════════════
    print("Testing DASHBOARD...")
    overview = t("Dashboard: Overview", "GET", "/dashboards/overview", token)
    if overview:
        for key in ["kpis", "leads_by_status", "matters_by_type", "overdue_tasks", "critical_deadlines"]:
            if key in overview:
                PASS.append(f"Dashboard: overview.{key} present")
            else:
                ERRORS.append(f"Dashboard: overview missing '{key}'")

    stats = t("Dashboard: Stats", "GET", "/dashboards/stats", token)
    if stats:
        for key in ["open_matters", "active_leads", "overdue_invoices", "pending_tasks", "collection_rate", "trends"]:
            if key in stats:
                PASS.append(f"Dashboard: stats.{key} present")
            else:
                ERRORS.append(f"Dashboard: stats missing '{key}'")

    t("Dashboard: Action Items", "GET", "/dashboards/action-items", token)

    # ═════════════════════════════════════════════════════════════
    # 3. LEADS
    # ═════════════════════════════════════════════════════════════
    print("Testing LEADS...")
    leads = t("Leads: List", "GET", "/leads/", token)
    if leads:
        if "items" in leads and "total" in leads:
            PASS.append(f"Leads: list has items+total ({leads['total']})")
        else:
            ERRORS.append(f"Leads: list missing items/total, keys={list(leads.keys())}")

    nl = t("Leads: Create", "POST", "/leads/", token, {
        "full_name": "QA Test Lead",
        "email": "qa-lead@test.cl",
        "phone": "+56912345678",
        "source": "referido",
        "notes": "Created by QA test",
    }, expect=201)
    if nl:
        lid = nl["id"]
        PASS.append(f"Leads: created id={lid}")
        t(f"Leads: Get #{lid}", "GET", f"/leads/{lid}", token)
        t(f"Leads: Update #{lid}", "PATCH", f"/leads/{lid}", token, {"notes": "Updated by QA"})

    # ═════════════════════════════════════════════════════════════
    # 4. CLIENTS
    # ═════════════════════════════════════════════════════════════
    print("Testing CLIENTS...")
    clients_list = t("Clients: List", "GET", "/clients/", token)

    nc = t("Clients: Create", "POST", "/clients/", token, {
        "full_name": "QA Client SpA",
        "rut": "76.543.210-K",
        "email": "qa-client@test.cl",
        "phone": "+56922334455",
    }, expect=201)
    if nc:
        cid = nc["id"]
        PASS.append(f"Clients: created id={cid}")
        t(f"Clients: Get #{cid}", "GET", f"/clients/{cid}", token)
        t(f"Clients: 360 #{cid}", "GET", f"/clients/{cid}/360", token)
    else:
        cid = 1

    # ═════════════════════════════════════════════════════════════
    # 5. MATTERS
    # ═════════════════════════════════════════════════════════════
    print("Testing MATTERS...")
    matters = t("Matters: List", "GET", "/matters/", token)

    nm = t("Matters: Create", "POST", "/matters/", token, {
        "title": "QA Test Matter",
        "client_id": cid,
        "matter_type": "civil",
        "description": "Created by QA test",
    }, expect=201)
    if nm:
        mid = nm["id"]
        PASS.append(f"Matters: created id={mid}")
        t(f"Matters: Get #{mid}", "GET", f"/matters/{mid}", token)

    # ═════════════════════════════════════════════════════════════
    # 6. PROPOSALS
    # ═════════════════════════════════════════════════════════════
    print("Testing PROPOSALS...")
    proposals = t("Proposals: List", "GET", "/proposals/", token)

    np_ = t("Proposals: Create", "POST", "/proposals/", token, {
        "client_id": cid,
        "amount": 1500000,
        "valid_days": 15,
        "description": "QA Proposal",
    }, expect=201)
    if np_:
        pid = np_["id"]
        PASS.append(f"Proposals: created id={pid}")
        t(f"Proposals: Get #{pid}", "GET", f"/proposals/{pid}", token)
        t(f"Proposals: Send #{pid}", "POST", f"/proposals/{pid}/send", token)
        t(f"Proposals: Accept #{pid}", "POST", f"/proposals/{pid}/accept", token)

    # ═════════════════════════════════════════════════════════════
    # 7. CONTRACTS
    # ═════════════════════════════════════════════════════════════
    print("Testing CONTRACTS...")
    contracts = t("Contracts: List", "GET", "/contracts/", token)
    t("Contracts: Stats", "GET", "/contracts/stats", token)
    if contracts and isinstance(contracts, list) and len(contracts) > 0:
        t(f"Contracts: Get #{contracts[0]['id']}", "GET", f"/contracts/{contracts[0]['id']}", token)

    # ═════════════════════════════════════════════════════════════
    # 8. COLLECTIONS
    # ═════════════════════════════════════════════════════════════
    print("Testing COLLECTIONS...")
    t("Collections: Invoices", "GET", "/collections/invoices", token)
    t("Collections: Stats", "GET", "/collections/stats", token)
    t("Collections: Cases", "GET", "/collections/cases", token)
    inv_detail = t("Collections: Invoice #1", "GET", "/collections/invoices/1", token)
    t("Collections: Invoice #1 Payments", "GET", "/collections/invoices/1/payments", token)
    t("Collections: Invoice #1 Timeline", "GET", "/collections/invoices/1/timeline", token)

    # ═════════════════════════════════════════════════════════════
    # 9. TEMPLATES
    # ═════════════════════════════════════════════════════════════
    print("Testing TEMPLATES...")
    templates = t("Templates: List", "GET", "/templates/", token)
    if templates and isinstance(templates, list) and len(templates) > 0:
        tid = templates[0]["id"]
        t(f"Templates: Get #{tid}", "GET", f"/templates/{tid}", token)
        t(f"Templates: Render #{tid}", "POST", f"/templates/{tid}/render", token, {
            "variables": {"nombre_cliente": "QA Client", "monto": "1.500.000"}
        })

    # Create template
    t("Templates: Create", "POST", "/templates/", token, {
        "template_type": "email",
        "name": "QA Test Template",
        "content_text": "Estimado {{ nombre_cliente }}, su caso esta en proceso.",
        "variables_json": {"nombre_cliente": "string"},
    }, expect=201)

    # ═════════════════════════════════════════════════════════════
    # 10. NOTIFICATIONS
    # ═════════════════════════════════════════════════════════════
    print("Testing NOTIFICATIONS...")
    t("Notifications: List", "GET", "/notifications/", token)
    t("Notifications: Unread Count", "GET", "/notifications/unread-count", token)

    # ═════════════════════════════════════════════════════════════
    # 11. CALENDAR
    # ═════════════════════════════════════════════════════════════
    print("Testing CALENDAR...")
    cal = t("Calendar: Events", "GET", "/calendar/events", token)
    if cal:
        PASS.append(f"Calendar: {len(cal)} events returned")

    # ═════════════════════════════════════════════════════════════
    # 12. COURT ACTIONS
    # ═════════════════════════════════════════════════════════════
    print("Testing COURT ACTIONS...")
    ca = t("Court Actions: List", "GET", "/court-actions/", token)
    if ca and isinstance(ca, dict) and "items" in ca and len(ca["items"]) > 0:
        ca_id = ca["items"][0]["id"]
        t(f"Court Actions: Get #{ca_id}", "GET", f"/court-actions/{ca_id}", token)

    # ═════════════════════════════════════════════════════════════
    # 13. NOTARY
    # ═════════════════════════════════════════════════════════════
    print("Testing NOTARY...")
    notary = t("Notary: List", "GET", "/notary/", token)
    if notary and isinstance(notary, list) and len(notary) > 0:
        nid = notary[0]["id"]
        t(f"Notary: Get #{nid}", "GET", f"/notary/{nid}", token)
        t("Notary: Stats", "GET", "/notary/stats", token)

    # ═════════════════════════════════════════════════════════════
    # 14. EMAIL TICKETS
    # ═════════════════════════════════════════════════════════════
    print("Testing EMAIL TICKETS...")
    tickets = t("Email Tickets: List", "GET", "/email-tickets/", token)
    if tickets and isinstance(tickets, list) and len(tickets) > 0:
        etid = tickets[0]["id"]
        t(f"Email Tickets: Get #{etid}", "GET", f"/email-tickets/{etid}", token)
        t("Email Tickets: Stats", "GET", "/email-tickets/stats", token)

    # ═════════════════════════════════════════════════════════════
    # 15. DOCUMENTS
    # ═════════════════════════════════════════════════════════════
    print("Testing DOCUMENTS...")
    t("Documents: List", "GET", "/documents/", token)

    # ═════════════════════════════════════════════════════════════
    # 16. TASKS
    # ═════════════════════════════════════════════════════════════
    print("Testing TASKS...")
    t("Tasks: List", "GET", "/tasks/", token)
    t("Tasks: Stats", "GET", "/tasks/stats", token)
    nt = t("Tasks: Create", "POST", "/tasks/", token, {
        "title": "QA Task",
        "task_type": "seguimiento",
        "priority": "medium",
    }, expect=201)
    if nt:
        PASS.append(f"Tasks: created id={nt['id']}")

    # ═════════════════════════════════════════════════════════════
    # 17. SEARCH
    # ═════════════════════════════════════════════════════════════
    print("Testing SEARCH...")
    search_r = t("Search: 'cobro'", "GET", "/search/?q=cobro", token)
    if search_r:
        PASS.append(f"Search: returned {len(search_r.get('results', []))} results")
    t("Search: by type", "GET", "/search/?q=QA&type=leads", token)

    # Short query (2 chars is valid with min_length=2)
    status, _ = api_req("GET", "/search/?q=ab", token)
    if status == 200:
        PASS.append("Search: 2-char query accepted (min_length=2)")
    else:
        ERRORS.append(f"Search: 2-char query returned {status}, expected 200")

    # 1-char query should fail
    status1, _ = api_req("GET", "/search/?q=a", token)
    if status1 == 422:
        PASS.append("Search: 1-char query rejected (422)")
    else:
        ERRORS.append(f"Search: 1-char query returned {status1}, expected 422")

    # ═════════════════════════════════════════════════════════════
    # 18. REPORTS
    # ═════════════════════════════════════════════════════════════
    print("Testing REPORTS...")
    t("Reports: Productivity", "GET", "/reports/productivity", token)
    t("Reports: Financial", "GET", "/reports/financial", token)
    t("Reports: SLA Compliance", "GET", "/reports/sla-compliance", token)
    t("Reports: Lead Conversion", "GET", "/reports/lead-conversion", token)
    t("Reports: Collections Aging", "GET", "/reports/collections-aging", token)

    # RBAC: Reports denied for non-gerente
    # Login as abogado
    try:
        d3 = urlencode({"username": "abogado@logan.cl", "password": "logan2024"}).encode()
        resp3 = urlopen(Request(API + "/auth/login", data=d3, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST"))
        abogado_token = json.loads(resp3.read().decode())["access_token"]
        status_r, _ = api_req("GET", "/reports/productivity", abogado_token)
        if status_r == 403:
            PASS.append("Reports: RBAC - abogado denied (403)")
        else:
            ERRORS.append(f"Reports: RBAC - abogado got {status_r}, expected 403")
    except Exception as e:
        ERRORS.append(f"Reports: RBAC test failed - {e}")

    # ═════════════════════════════════════════════════════════════
    # 19. ADMIN
    # ═════════════════════════════════════════════════════════════
    print("Testing ADMIN...")
    t("Admin: Dashboard", "GET", "/admin/dashboard", token)

    # ═════════════════════════════════════════════════════════════
    # 20. AGENT LOGS
    # ═════════════════════════════════════════════════════════════
    print("Testing AGENT LOGS...")
    t("Agent Logs: List", "GET", "/agent-logs/", token)
    t("Agent Logs: Entity filter", "GET", "/agent-logs/?entity_type=matter&entity_id=1", token)

    # ═════════════════════════════════════════════════════════════
    # 21. AGENTS
    # ═════════════════════════════════════════════════════════════
    print("Testing AGENTS...")
    agents = t("Agents: List", "GET", "/agents/", token)
    if agents and len(agents) > 0:
        aid = agents[0]["id"]
        agent_detail = t(f"Agents: Detail #{aid}", "GET", f"/agents/{aid}", token)
        if agent_detail:
            for key in ["id", "display_name", "role", "model_name", "is_active"]:
                if key in agent_detail:
                    PASS.append(f"Agents: detail.{key} present")
                else:
                    ERRORS.append(f"Agents: detail missing '{key}'")
            # Check skills
            if "skills" in agent_detail:
                PASS.append(f"Agents: {len(agent_detail['skills'])} skills loaded")
            else:
                ERRORS.append("Agents: detail missing 'skills'")

        t(f"Agents: Tasks #{aid}", "GET", f"/agents/{aid}/tasks", token)
        t(f"Agents: Conversations #{aid}", "GET", f"/agents/{aid}/conversations", token)
        t(f"Agents: Costs #{aid}", "GET", f"/agents/{aid}/costs", token)

        # Update agent
        t(f"Agents: Update #{aid}", "PATCH", f"/agents/{aid}", token, {"is_active": True})

        # Update skill
        if agent_detail and "skills" in agent_detail and len(agent_detail["skills"]) > 0:
            skill = agent_detail["skills"][0]
            t(f"Agents: Update Skill", "PATCH", f"/agents/{aid}/skills/{skill['id']}", token, {"is_autonomous": True})

    # ═════════════════════════════════════════════════════════════
    # 22. COMMUNICATIONS
    # ═════════════════════════════════════════════════════════════
    print("Testing COMMUNICATIONS...")
    t("Communications: List", "GET", "/communications/", token)

    # ═════════════════════════════════════════════════════════════
    # 23. TIME TRACKING
    # ═════════════════════════════════════════════════════════════
    print("Testing TIME TRACKING...")
    t("Time Tracking: List", "GET", "/time-tracking/", token)

    # ═════════════════════════════════════════════════════════════
    # 24. SCRAPER
    # ═════════════════════════════════════════════════════════════
    print("Testing SCRAPER...")
    t("Scraper: Jobs", "GET", "/scraper/jobs", token)

    # ═════════════════════════════════════════════════════════════
    # 25. HEALTH + DOCS
    # ═════════════════════════════════════════════════════════════
    print("Testing HEALTH + DOCS...")
    try:
        r = urlopen(Request("http://localhost:8000/health"))
        PASS.append("Health: /health OK")
    except HTTPError as e:
        ERRORS.append(f"Health: /health -> {e.code}")

    try:
        r = urlopen(Request("http://localhost:8000/docs"))
        PASS.append("Docs: /docs available")
    except Exception:
        ERRORS.append("Docs: /docs not available")

    # ═════════════════════════════════════════════════════════════
    # 26. SECURITY HEADERS
    # ═════════════════════════════════════════════════════════════
    print("Testing SECURITY...")
    try:
        r = urlopen(Request("http://localhost:8000/health"))
        headers = dict(r.headers)
        for h in ["X-Content-Type-Options", "X-Frame-Options"]:
            if h.lower() in [k.lower() for k in headers]:
                PASS.append(f"Security: {h} header present")
            else:
                ERRORS.append(f"Security: {h} header missing")
    except Exception as e:
        ERRORS.append(f"Security: header check failed - {e}")

    # ═════════════════════════════════════════════════════════════
    # 27. AGENT EXECUTE (dry run - will fail without Anthropic key validity)
    # ═════════════════════════════════════════════════════════════
    print("Testing AGENT EXECUTE...")
    if agents and len(agents) > 0:
        exec_result = t("Agents: Execute", "POST", f"/agents/{agents[0]['id']}/execute", token, {
            "message": "Hola, soy una prueba QA"
        })
        # We accept both 200 (if API key works) or error in result
        if exec_result is not None:
            PASS.append("Agents: Execute endpoint responds")

    # ═════════════════════════════════════════════════════════════
    # 28. TASK RESOLUTION (Escalation)
    # ═════════════════════════════════════════════════════════════
    print("Testing TASK RESOLUTION...")
    if agents and len(agents) > 0:
        # Try to resolve a non-escalated task (should fail)
        tasks_list = t("Resolve prep: list tasks", "GET", f"/agents/{agents[0]['id']}/tasks", token)
        if tasks_list and isinstance(tasks_list, list) and len(tasks_list) > 0:
            # This should fail because task is not escalated
            status_res, _ = api_req("POST", f"/agents/{agents[0]['id']}/tasks/{tasks_list[0]['id']}/resolve", token, {
                "action": "approve", "notes": "QA test"
            })
            if status_res == 400:
                PASS.append("Resolve: non-escalated task correctly rejected (400)")
            elif status_res == 200:
                PASS.append("Resolve: endpoint works (task was escalated)")
            else:
                ERRORS.append(f"Resolve: unexpected status {status_res}")

    # ═════════════════════════════════════════════════════════════
    # 29. WORKFLOWS
    # ═════════════════════════════════════════════════════════════
    print("Testing WORKFLOWS...")
    t("Workflows: List", "GET", "/agents/workflows", token)

    # ═════════════════════════════════════════════════════════════
    # FINAL REPORT
    # ═════════════════════════════════════════════════════════════
    print()
    print("=" * 70)
    print(f"  QA COMPLETE: {len(PASS)} PASSED / {len(ERRORS)} FAILED")
    print("=" * 70)
    print()

    if ERRORS:
        print("FAILURES:")
        print("-" * 70)
        for i, e in enumerate(ERRORS, 1):
            print(f"  {i:2d}. {e}")
        print()

    print(f"PASSED ({len(PASS)}):")
    print("-" * 70)
    for p in PASS:
        print(f"  + {p}")

    return len(ERRORS)


if __name__ == "__main__":
    sys.exit(main())
