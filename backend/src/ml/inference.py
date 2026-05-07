"""
Load and use trained Isolation Forest anomaly detector for inference.
"""
from __future__ import annotations

import pickle
from pathlib import Path
from typing import Optional, Dict, Any, TYPE_CHECKING

try:
    import numpy as np  # noqa: F401
    import pandas as pd
    _ML_DEPS_AVAILABLE = True
except ImportError:
    _ML_DEPS_AVAILABLE = False
    if not TYPE_CHECKING:
        class _PdStub:
            DataFrame = object
        pd = _PdStub()  # type: ignore


class AnomalyDetector:
    """Wrapper for trained Isolation Forest model."""
    
    def __init__(self):
        """Load trained model and preprocessing objects."""
        model_dir = Path(__file__).parent
        
        self.model_path = model_dir / "isolation_forest_model.pkl"
        self.scaler_path = model_dir / "feature_scaler.pkl"
        self.encoders_path = model_dir / "label_encoders.pkl"
        self.features_path = model_dir / "feature_names.pkl"
        
        # Load components
        self._load_model()
    
    def _load_model(self):
        """Load persisted model and preprocessing objects."""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            with open(self.encoders_path, 'rb') as f:
                self.encoders = pickle.load(f)
            with open(self.features_path, 'rb') as f:
                self.feature_names = pickle.load(f)
            print("✓ Anomaly detector loaded successfully")
        except FileNotFoundError as e:
            raise RuntimeError(
                f"ML model not found. Run: python -m src.ml.train_anomaly_detector\n{e}"
            )

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _encode_categorical(self, feature_name: str, raw_value: Any, default: float = 0.0) -> float:
        encoder = self.encoders.get(feature_name)
        if encoder is None:
            return default

        candidate = str(raw_value)
        classes = set(str(item) for item in encoder.classes_)
        if candidate not in classes:
            return default

        return float(encoder.transform([candidate])[0])
    
    def extract_features(self, event: Dict[str, Any]) -> Optional[pd.DataFrame]:
        """
        Extract and prepare features from a log event for model inference.
        
        Args:
            event: Dictionary with log event data
            
        Returns:
            Scaled feature array if successful, None if extraction fails
        """
        try:
            # Build feature vector matching training feature order
            features: dict[str, float] = {}
            
            # Extract from event with defaults
            for feature in self.feature_names:
                if feature == 'id':
                    features[feature] = self._safe_float(event.get('id', 0))
                elif feature == 'dur':
                    features[feature] = self._safe_float(event.get('duration', 0))
                elif feature == 'proto':
                    proto = str(event.get('protocol', 'tcp')).lower()
                    features[feature] = self._encode_categorical('proto', proto)
                elif feature == 'service':
                    service = str(event.get('service', 'unknown')).lower()
                    features[feature] = self._encode_categorical('service', service)
                elif feature == 'state':
                    state = str(event.get('state', 'CON')).upper()
                    features[feature] = self._encode_categorical('state', state)
                # Numerical features with defaults
                else:
                    features[feature] = self._safe_float(event.get(feature, 0))
            
            # Keep dataframe column names to match scaler fit-time features
            X = pd.DataFrame([{name: features[name] for name in self.feature_names}], columns=self.feature_names)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            return pd.DataFrame(X_scaled, columns=self.feature_names)
        
        except Exception as e:
            print(f"Warning: Failed to extract features: {e}")
            return None
    
    def predict_anomaly_score(self, event: Dict[str, Any]) -> Optional[float]:
        """
        Predict anomaly score for a log event using trained Isolation Forest.
        
        Returns anomaly score in range [0, 1] where:
        - 0.0 = definitely normal
        - 1.0 = definitely anomalous
        - None = feature extraction failed
        """
        X_scaled = self.extract_features(event)
        if X_scaled is None:
            return None
        
        # Get raw anomaly score from model
        # Isolation Forest score_samples returns lower scores for anomalies
        raw_score = self.model.score_samples(X_scaled.to_numpy())[0]
        
        # Normalize to [0, 1] where lower raw score means more anomalous.
        # UNSW training range is commonly around [-0.7, -0.3].
        normalized_score = 1.0 - max(0.0, min(1.0, (raw_score + 0.7) / 0.4))
        
        return normalized_score


# Global instance
_detector = None


def get_detector() -> AnomalyDetector:
    """Get or initialize the global anomaly detector."""
    global _detector
    if not _ML_DEPS_AVAILABLE:
        raise RuntimeError("ML deps (pandas/numpy) not installed")
    if _detector is None:
        _detector = AnomalyDetector()
    return _detector


_ml_warned = {"v": False}


def predict_ml_anomaly_score(event: Dict[str, Any]) -> Optional[float]:
    """
    Predict anomaly score using ML model.
    
    Args:
        event: Log event dictionary
        
    Returns:
        Anomaly score [0, 1] or None if inference fails
    """
    if not _ML_DEPS_AVAILABLE:
        if not _ml_warned["v"]:
            print("ML deps unavailable — running heuristic-only mode")
            _ml_warned["v"] = True
        return None
    try:
        detector = get_detector()
        return detector.predict_anomaly_score(event)
    except Exception as e:
        if not _ml_warned["v"]:
            print(f"ML inference disabled: {e}")
            _ml_warned["v"] = True
        return None


def get_model_status() -> dict[str, Any]:
    """Return model availability metadata for UI/monitoring."""
    if not _ML_DEPS_AVAILABLE:
        return {"online": False, "model_name": "none"}
    model_dir = Path(__file__).parent
    model_files = [
        model_dir / "isolation_forest_model.pkl",
        model_dir / "feature_scaler.pkl",
        model_dir / "label_encoders.pkl",
        model_dir / "feature_names.pkl",
    ]
    online = all(path.exists() for path in model_files)
    return {
        "online": online,
        "model_name": "isolation-forest-v1" if online else "none",
    }
