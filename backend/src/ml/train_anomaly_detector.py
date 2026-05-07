"""
Train Isolation Forest anomaly detector on UNSW-NB15 dataset.
Saves model as isolation_forest_model.pkl
"""
import os
import pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from pathlib import Path


def load_and_prepare_data():
    """Load UNSW-NB15 dataset and prepare for training."""
    data_dir = Path(__file__).parent.parent.parent / "data"
    
    # Load training set
    print("Loading UNSW-NB15 training dataset...")
    train_file = data_dir / "UNSW_NB15_training-set.csv"
    
    if not train_file.exists():
        raise FileNotFoundError(f"Dataset not found at {train_file}")
    
    df = pd.read_csv(train_file)
    print(f"Loaded {len(df)} records from training set")
    print(f"Shape: {df.shape}")
    
    # Display basic info
    print(f"\nColumns: {df.columns.tolist()}")
    print(f"\nLabel distribution:\n{df['label'].value_counts()}")
    
    return df


def preprocess_data(df):
    """Preprocess data for Isolation Forest training."""
    print("\nPreprocessing data...")
    
    # Drop non-numeric columns we don't need
    drop_cols = ['srcip', 'dstip', 'Stime', 'Ltime', 'attack_cat']
    df_processed = df.drop(columns=[c for c in drop_cols if c in df.columns])
    
    # Handle categorical features
    categorical_cols = ['proto', 'state', 'service']
    label_encoders = {}
    
    for col in categorical_cols:
        if col in df_processed.columns:
            le = LabelEncoder()
            df_processed[col] = le.fit_transform(df_processed[col].astype(str))
            label_encoders[col] = le
            print(f"Encoded '{col}': {len(le.classes_)} unique values")
    
    # Handle missing values
    df_processed = df_processed.fillna(0)
    
    # Separate features and labels
    X = df_processed.drop(columns=['label'])
    y = df_processed['label']
    
    print(f"Features shape: {X.shape}")
    print(f"Features used: {X.columns.tolist()}")
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y, scaler, label_encoders, X.columns.tolist()


def train_isolation_forest(X_scaled, y):
    """Train Isolation Forest on the dataset."""
    print("\nTraining Isolation Forest...")
    
    # IsolationForest with tuned hyperparameters
    # contamination=0.1 means we expect ~10% anomalies (similar to attack rate)
    iso_forest = IsolationForest(
        contamination=0.1,          # 10% anomaly rate (attacks are ~10% of dataset)
        random_state=42,
        n_estimators=100,
        n_jobs=-1,                  # Use all CPU cores
        verbose=1
    )
    
    # Fit on all data
    iso_forest.fit(X_scaled)
    
    # Evaluate on training set
    y_pred = iso_forest.predict(X_scaled)  # -1 for anomalies, 1 for normal
    anomaly_scores = iso_forest.score_samples(X_scaled)
    
    # Convert to binary (1 = anomaly, 0 = normal)
    y_pred_binary = (y_pred == -1).astype(int)
    
    # Calculate metrics
    n_anomalies_detected = (y_pred_binary == 1).sum()
    accuracy = (y_pred_binary == y).sum() / len(y)
    
    print(f"\nModel trained!")
    print(f"Anomalies detected: {n_anomalies_detected} / {len(y)}")
    print(f"Training accuracy: {accuracy:.4f}")
    print(f"Anomaly score range: [{anomaly_scores.min():.4f}, {anomaly_scores.max():.4f}]")
    
    return iso_forest


def save_model(iso_forest, scaler, label_encoders, feature_names):
    """Save trained model and preprocessing objects."""
    model_dir = Path(__file__).parent
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Save model
    model_path = model_dir / "isolation_forest_model.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(iso_forest, f)
    print(f"\n✓ Model saved to {model_path}")
    
    # Save scaler
    scaler_path = model_dir / "feature_scaler.pkl"
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"✓ Scaler saved to {scaler_path}")
    
    # Save label encoders
    encoders_path = model_dir / "label_encoders.pkl"
    with open(encoders_path, 'wb') as f:
        pickle.dump(label_encoders, f)
    print(f"✓ Label encoders saved to {encoders_path}")
    
    # Save feature names
    features_path = model_dir / "feature_names.pkl"
    with open(features_path, 'wb') as f:
        pickle.dump(feature_names, f)
    print(f"✓ Feature names saved to {features_path}")


def main():
    """Main training pipeline."""
    print("=" * 60)
    print("UNSW-NB15 Isolation Forest Anomaly Detector Training")
    print("=" * 60)
    
    # Load and prepare data
    df = load_and_prepare_data()
    X_scaled, y, scaler, label_encoders, feature_names = preprocess_data(df)
    
    # Train model
    iso_forest = train_isolation_forest(X_scaled, y)
    
    # Save model and preprocessing objects
    save_model(iso_forest, scaler, label_encoders, feature_names)
    
    print("\n" + "=" * 60)
    print("Training complete! Ready for integration.")
    print("=" * 60)


if __name__ == "__main__":
    main()
