from datetime import datetime, timedelta, timezone

from src.database.models import LogEvent, Rule, ThreatIndicator
from src.services.rule_engine import _evaluate_rule  # type: ignore


def _log(**kw):
    base = dict(
        id=1,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
        source_ip="10.0.0.1",
        destination_ip=None,
        host=None,
        event_type="auth_failure",
        severity="medium",
        username="alice",
        status="fail",
        source="okta",
        protocol="tcp",
        port=22,
        action=None,
        result="failure",
        bytes_out=0,
        raw_data={},
    )
    base.update(kw)
    return LogEvent(**base)


def _rule(condition, severity="high"):
    return Rule(id="r-test", name="t", description="", condition=condition, severity=severity, enabled=True, created_by="t")


def test_eq_clause():
    log = _log(event_type="auth_failure")
    rule = _rule({"all": [{"field": "event_type", "op": "eq", "value": "auth_failure"}]})
    assert _evaluate_rule(None, log, [log], rule) is True


def test_count_gt_window():
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    logs = [_log(id=i, timestamp=now - timedelta(seconds=i*5)) for i in range(8)]
    rule = _rule({"all": [{"field": "source_ip", "op": "count_gt", "value": 5, "window_sec": 60}]})
    assert _evaluate_rule(None, logs[0], logs, rule) is True


def test_hour_between():
    log = _log(timestamp=datetime(2026, 1, 1, 3, 0, 0))
    rule = _rule({"all": [{"field": "ts", "op": "hour_between", "value": [0, 5]}]})
    assert _evaluate_rule(None, log, [log], rule) is True


def test_no_clauses_does_not_match():
    log = _log()
    rule = _rule({})
    assert _evaluate_rule(None, log, [log], rule) is False