from __future__ import annotations

from collections import Counter
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from src.database.models import AnomalyScore, Feature, LogEvent
from src.ml.inference import predict_ml_anomaly_score

HIGH_RISK_EVENT_TYPES = {"auth_failure", "port_scan", "firewall_block", "privilege_escalation"}


def _service_from_log(log: LogEvent) -> str:
    if not log.port:
        return "-"
    mapping = {
        21: "ftp",
        25: "smtp",
        53: "dns",
        80: "http",
        443: "http",
    }
    return mapping.get(log.port, "-")


def extract_features(db: Session, log: LogEvent) -> Feature:
    window_start = log.timestamp - timedelta(minutes=5)
    recent_logs = (
        db.query(LogEvent)
        .filter(LogEvent.source_ip == log.source_ip)
        .filter(LogEvent.timestamp >= window_start)
        .all()
    )

    event_types = Counter(item.event_type for item in recent_logs)
    failed_logins = sum(1 for item in recent_logs if item.event_type == "auth_failure" or (item.status or "").lower() in {"fail", "failure", "blocked"})
    unique_destinations = len({item.destination_ip for item in recent_logs if item.destination_ip})
    off_hours = int(log.timestamp.hour < 6 or log.timestamp.hour >= 22)
    burst_traffic = int(len(recent_logs) >= 20)
    high_risk_event = int(log.event_type in HIGH_RISK_EVENT_TYPES)

    metrics: dict[str, Any] = {
        "window_seconds": 300,
        "recent_events": len(recent_logs),
        "failed_logins": failed_logins,
        "unique_destinations": unique_destinations,
        "distinct_event_types": len(event_types),
        "off_hours": bool(off_hours),
        "burst_traffic": bool(burst_traffic),
        "high_risk_event": bool(high_risk_event),
    }

    return Feature(
        log_event_id=log.id,
        source_ip=log.source_ip,
        window_seconds=300,
        event_count_5m=len(recent_logs),
        failed_login_count_5m=failed_logins,
        unique_destination_count_5m=unique_destinations,
        distinct_event_types_5m=len(event_types),
        off_hours_activity=off_hours,
        burst_traffic=burst_traffic,
        high_risk_event=high_risk_event,
        metrics=metrics,
    )


def score_event(log: LogEvent, feature: Feature) -> AnomalyScore:
    # ==================== HEURISTIC SCORING ====================
    heuristic_score = 0.08
    heuristic_reasons: list[str] = []

    if log.event_type == "auth_failure":
        heuristic_score += 0.32
        heuristic_reasons.append("authentication failure")
    if log.event_type == "port_scan":
        heuristic_score += 0.35
        heuristic_reasons.append("port scan pattern")
    if feature.failed_login_count_5m >= 5:
        heuristic_score += 0.15
        heuristic_reasons.append("repeated failures in 5m")
    if feature.unique_destination_count_5m >= 4:
        heuristic_score += 0.12
        heuristic_reasons.append("many destinations in 5m")
    if feature.distinct_event_types_5m >= 4:
        heuristic_score += 0.10
        heuristic_reasons.append("mixed event types from one source")
    if feature.off_hours_activity:
        heuristic_score += 0.08
        heuristic_reasons.append("off-hours activity")
    if feature.burst_traffic:
        heuristic_score += 0.15
        heuristic_reasons.append("burst activity")
    if feature.high_risk_event:
        heuristic_score += 0.10
        heuristic_reasons.append("high-risk event type")

    heuristic_score = min(heuristic_score, 0.99)
    
    # ==================== ML SCORING ====================
    ml_score = None
    ml_reasons: list[str] = []
    
    try:
        # Build event dict for ML model using correct log fields
        raw = log.raw_data or {}
        event_dict = {
            'id': log.id or 0,
            'duration': raw.get('duration', 0),
            'protocol': log.protocol or 'tcp',
            'service': _service_from_log(log),
            'state': str(raw.get('state', 'CON')).upper(),
            'spkts': feature.event_count_5m or 0,
            'dpkts': feature.event_count_5m or 0,
            'sbytes': log.bytes_out or 0,
            'dbytes': raw.get('dbytes', 0),
            'rate': raw.get('rate', 0),
            'sttl': raw.get('sttl', 64),
            'dttl': raw.get('dttl', 64),
            'sload': raw.get('sload', 0),
            'dload': raw.get('dload', 0),
            'sloss': raw.get('sloss', 0),
            'dloss': raw.get('dloss', 0),
            'sinpkt': raw.get('sinpkt', 0),
            'dinpkt': raw.get('dinpkt', 0),
            'sjit': raw.get('sjit', 0),
            'djit': raw.get('djit', 0),
            'swin': raw.get('swin', 0),
            'stcpb': raw.get('stcpb', 0),
            'dtcpb': raw.get('dtcpb', 0),
            'dwin': raw.get('dwin', 0),
            'tcprtt': raw.get('tcprtt', 0),
            'synack': raw.get('synack', 0),
            'ackdat': raw.get('ackdat', 0),
            'smean': raw.get('smean', 0),
            'dmean': raw.get('dmean', 0),
            'trans_depth': raw.get('trans_depth', 0),
            'response_body_len': raw.get('response_body_len', 0),
            'ct_srv_src': feature.event_count_5m or 0,
            'ct_state_ttl': raw.get('ct_state_ttl', 0),
            'ct_dst_ltm': feature.unique_destination_count_5m or 0,
            'ct_src_dport_ltm': raw.get('ct_src_dport_ltm', 0),
            'ct_dst_sport_ltm': raw.get('ct_dst_sport_ltm', 0),
            'ct_dst_src_ltm': raw.get('ct_dst_src_ltm', 0),
            'is_ftp_login': raw.get('is_ftp_login', 0),
            'ct_ftp_cmd': raw.get('ct_ftp_cmd', 0),
            'ct_flw_http_mthd': raw.get('ct_flw_http_mthd', 0),
            'ct_src_ltm': raw.get('ct_src_ltm', 0),
            'ct_srv_dst': raw.get('ct_srv_dst', 0),
            'is_sm_ips_ports': raw.get('is_sm_ips_ports', 0),
        }
        
        ml_score = predict_ml_anomaly_score(event_dict)
        if ml_score is not None:
            ml_reasons.append(f"ML model: {ml_score:.2f}")
    except Exception:
        # ML scoring failed, fall back to heuristic only
        pass
    
    # ==================== ENSEMBLE SCORING ====================
    # Combine heuristic and ML scores
    if ml_score is not None:
        # Weighted average: 60% heuristic + 40% ML
        final_score = (0.6 * heuristic_score) + (0.4 * ml_score)
        final_reasons = heuristic_reasons + ml_reasons
        model_name = "ensemble-heuristic-isolation-forest"
    else:
        # Fall back to heuristic only
        final_score = heuristic_score
        final_reasons = heuristic_reasons or ["baseline heuristic score"]
        model_name = "heuristic-v1"
    
    final_score = min(final_score, 0.99)
    severity = _severity_for_score(final_score)

    return AnomalyScore(
        log_event_id=log.id,
        score=final_score,
        model_name=model_name,
        severity=severity,
        reason="; ".join(final_reasons),
    )


def _severity_for_score(score: float) -> str:
    if score >= 0.9:
        return "critical"
    if score >= 0.7:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"
