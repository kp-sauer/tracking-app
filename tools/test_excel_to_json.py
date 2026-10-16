import re
from excel_to_json import seed_dateiname, baue_huelle

def test_seed_dateiname_enthaelt_welt_und_zeitstempel():
    name = seed_dateiname("test", when="2026-10-14_1532")
    assert name == "seed_test_2026-10-14_1532.json"

def test_seed_dateiname_format_passt_zu_regex():
    name = seed_dateiname("produktiv", when="2026-10-14_1532")
    assert re.match(r"^seed_(test|produktiv)_\d{4}-\d{2}-\d{2}_\d{4}\.json$", name)

def test_baue_huelle_setzt_welt_und_schema():
    h = baue_huelle("test", when_iso="2026-10-14T15:32:00")
    assert h["welt"] == "test"
    assert h["schema_version"] == 1
    assert h["exportiert_am"] == "2026-10-14T15:32:00"
    assert h["tageseintraege"] == {}
    assert h["ereignisse"] == []
    assert h["profil"] is None

from excel_to_json import parse_marker

def test_mj_frueh_ist_10mg():
    assert parse_marker("MJ 1/1")  == {"praeparat": "MJ", "dosis_mg": 10,   "pen_anwendung": None, "historie_rohtext": None}
    assert parse_marker("MJ 5/1")  == {"praeparat": "MJ", "dosis_mg": 10,   "pen_anwendung": None, "historie_rohtext": None}
    assert parse_marker("MJ 2/2")  == {"praeparat": "MJ", "dosis_mg": 10,   "pen_anwendung": None, "historie_rohtext": None}

def test_mj_ab_12_ist_12_5mg():
    assert parse_marker("MJ 12/3") == {"praeparat": "MJ", "dosis_mg": 12.5, "pen_anwendung": None, "historie_rohtext": None}
    assert parse_marker("MJ 12/6") == {"praeparat": "MJ", "dosis_mg": 12.5, "pen_anwendung": None, "historie_rohtext": None}

def test_oz_wg_bleiben_rohtext():
    assert parse_marker("OZ 10/2") == {"praeparat": "OZ", "dosis_mg": None, "pen_anwendung": None, "historie_rohtext": "OZ 10/2"}
    assert parse_marker("WG 3/1")  == {"praeparat": "WG", "dosis_mg": None, "pen_anwendung": None, "historie_rohtext": "WG 3/1"}
    assert parse_marker("Ozempic") == {"praeparat": "OZ", "dosis_mg": None, "pen_anwendung": None, "historie_rohtext": "Ozempic"}

def test_leerer_marker_ist_none():
    assert parse_marker("") is None
    assert parse_marker(None) is None

from datetime import date
from excel_to_json import zeile_zu_eintrag

def test_zeile_mit_datum_und_gewicht():
    datum, eintrag = zeile_zu_eintrag(datum=date(2026, 10, 14), gewicht=95.9, marker="MJ 12/6")
    assert datum == "2026-10-14"
    assert eintrag["gewicht_kg"] == 95.9
    assert eintrag["spritze"]["praeparat"] == "MJ"
    assert eintrag["spritze"]["dosis_mg"] == 12.5

def test_zeile_ohne_spritze():
    datum, eintrag = zeile_zu_eintrag(datum=date(2026, 10, 13), gewicht=96.0, marker=None)
    assert eintrag["spritze"] is None

def test_leerzeile_wird_verworfen():
    assert zeile_zu_eintrag(datum=None, gewicht=95.9, marker=None) is None
    assert zeile_zu_eintrag(datum=date(2026, 10, 14), gewicht=None, marker=None) is None

import os, json
from excel_to_json import schreibe_seed

def test_schreibe_seed_ueberschreibt_nicht(tmp_path):
    huelle = {"welt": "test", "schema_version": 1, "exportiert_am": "x",
              "profil": None, "tageseintraege": {}, "ereignisse": []}
    p1 = schreibe_seed(huelle, out_dir=str(tmp_path), when="2026-10-14_1532")
    assert os.path.basename(p1) == "seed_test_2026-10-14_1532.json"
    try:
        schreibe_seed(huelle, out_dir=str(tmp_path), when="2026-10-14_1532")
        assert False, "Erwartete FileExistsError"
    except FileExistsError:
        pass

def test_geschriebene_datei_ist_gueltiges_json(tmp_path):
    huelle = {"welt": "produktiv", "schema_version": 1, "exportiert_am": "x",
              "profil": None, "tageseintraege": {}, "ereignisse": []}
    p = schreibe_seed(huelle, out_dir=str(tmp_path), when="2026-10-14_0900")
    with open(p, encoding="utf-8") as f:
        wieder = json.load(f)
    assert wieder["welt"] == "produktiv"
