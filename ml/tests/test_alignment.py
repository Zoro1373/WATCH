import datetime as dt
from ml.pipeline import align_observations

def _mk_record(lat, lon, ts, **fields):
    rec = {"latitude": lat, "longitude": lon, "timestamp": ts}
    rec.update(fields)
    return rec

def test_single_location_all_sources_available():
    ref = dt.datetime(2026, 8, 12, 13, 0, 0, tzinfo=dt.timezone.utc)
    water = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=5), ph=7.0, tds=400, turbidity=5.0, temperature=25.0)]
    symptoms = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=10), feverCount=2, diarrheaCount=1, vomitingCount=0, abdominalPainCount=0)]
    weather = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=2), temperature=28.0, precipitation=0.0, humidity=80.0)]
    aligned = align_observations(water, symptoms, weather, reference_time=ref)
    assert len(aligned) == 1
    obs = aligned[0]
    assert obs["location"] == {"latitude": 8.0, "longitude": 77.0}
    assert obs["timestamp"] == ref.isoformat()
    assert obs["water"]["ph"] == 7.0
    assert obs["symptoms"]["feverCount"] == 2
    assert obs["weather"]["humidity"] == 80.0

def test_multiple_locations_and_latest_selection():
    ref = dt.datetime(2026, 8, 12, 14, 0, 0, tzinfo=dt.timezone.utc)
    water = [
        _mk_record(8.0, 77.0, ref - dt.timedelta(minutes=30), ph=7.0, tds=400, turbidity=5.0, temperature=25.0),
        _mk_record(8.0, 77.0, ref - dt.timedelta(minutes=10), ph=6.5, tds=420, turbidity=6.0, temperature=26.0),
        _mk_record(9.0, 78.0, ref - dt.timedelta(minutes=20), ph=7.2, tds=410, turbidity=5.5, temperature=24.5),
    ]
    symptoms = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=15), feverCount=1, diarrheaCount=0, vomitingCount=0, abdominalPainCount=0)]
    weather = [_mk_record(9.0, 78.0, ref - dt.timedelta(minutes=5), temperature=27.0, precipitation=0.0, humidity=75.0)]
    aligned = align_observations(water, symptoms, weather, reference_time=ref)
    # Two locations expected (8.0,77.0) and (9.0,78.0)
    assert len(aligned) == 2
    locs = {tuple(obs["location"].values()) for obs in aligned}
    assert (8.0, 77.0) in locs and (9.0, 78.0) in locs
    # Verify that the latest water reading for (8.0,77.0) is used (ph=6.5)
    for obs in aligned:
        if obs["location"]["latitude"] == 8.0:
            assert obs["water"]["ph"] == 6.5

def test_record_outside_window_is_missing():
    ref = dt.datetime(2026, 8, 12, 15, 0, 0, tzinfo=dt.timezone.utc)
    water = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=61), ph=7.0, tds=400, turbidity=5.0, temperature=25.0)]
    aligned = align_observations(water, [], [], reference_time=ref)
    # No valid water record, thus no aligned observation (since locations are derived from water)
    assert len(aligned) == 0

def test_missing_symptoms_and_weather_yield_nulls():
    ref = dt.datetime(2026, 8, 12, 16, 0, 0, tzinfo=dt.timezone.utc)
    water = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=5), ph=7.0, tds=400, turbidity=5.0, temperature=25.0)]
    aligned = align_observations(water, [], [], reference_time=ref)
    assert len(aligned) == 1
    obs = aligned[0]
    assert all(v is None for v in obs["symptoms"].values())
    assert all(v is None for v in obs["weather"].values())

def test_missing_water_fields_are_none():
    ref = dt.datetime(2026, 8, 12, 17, 0, 0, tzinfo=dt.timezone.utc)
    water = [_mk_record(8.0, 77.0, ref - dt.timedelta(minutes=5), ph=None, tds=None, turbidity=None, temperature=None)]
    aligned = align_observations(water, [], [], reference_time=ref)
    obs = aligned[0]
    assert all(v is None for v in obs["water"].values())
