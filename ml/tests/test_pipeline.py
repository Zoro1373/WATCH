import pytest
from ml import pipeline

def test_load_data_returns_list():
    data = pipeline.load_data()
    assert isinstance(data, list)

def test_preprocess_returns_dataframe():
    df = pipeline.preprocess([])
    # pandas DataFrame should have attribute "shape"
    assert hasattr(df, "shape")
