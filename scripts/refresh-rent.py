from __future__ import annotations

import json
import ssl
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT / "data" / "rent-history.json"
LOG_PATH = ROOT / "data" / "rent-refresh-log.jsonl"
STATUS_PATH = ROOT / "data" / "rent-status.json"
AJAX_URL = "https://verisresidential.com/wp-admin/admin-ajax.php"
SOURCE_URL = "https://verisresidential.com/jersey-city-nj-apartments/the-blvd-collection/"
TIMEZONE = ZoneInfo("America/New_York")

FLOORPLAN_LIST_PAYLOAD = {
    "index_table": "omg_apt_idx",
    "default_order": [{"order_column": "apt_id", "order_direction": "desc"}],
    "environment": {"page_id": "1664", "custom_post_type": "property_id"},
    "facets": [
        {
            "slug": "ra_bedrooms",
            "slug_max": False,
            "action": "filter",
            "facet": "select",
            "operator": "=",
            "uid": "bedrooms",
            "default_value": None,
            "range_select_choices": None,
            "placeholder": "Choose an option",
            "selected_value": "",
        },
        {
            "slug": False,
            "slug_max": False,
            "action": "sort",
            "facet": "select",
            "operator": "=",
            "uid": "prop_apts_sort",
            "default_value": None,
            "range_select_choices": None,
            "placeholder": "Choose an option",
            "selected_value": "",
            "sort_items": [
                {
                    "facet_sort_item_label": "Sqft",
                    "facet_sort_item_field": "apt_id",
                    "facet_sort_item_direction": "asc",
                    "minmax": "0",
                },
                {
                    "facet_sort_item_label": "Move in date",
                    "facet_sort_item_field": "apt_id",
                    "facet_sort_item_direction": "desc",
                    "minmax": "0",
                },
                {
                    "facet_sort_item_label": "Rent",
                    "facet_sort_item_field": "apt_id",
                    "facet_sort_item_direction": "asc",
                    "minmax": "0",
                },
            ],
        },
        {
            "slug": "omg_feeds_voyager_property_code",
            "slug_max": False,
            "action": "filter",
            "facet": "multi_select",
            "operator": "IN",
            "uid": "prop_voyager_property_code",
            "default_value": None,
            "range_select_choices": None,
            "placeholder": "",
            "selected_value": "",
        },
        {
            "slug": "is_renovated",
            "slug_max": False,
            "action": "filter",
            "facet": "select",
            "operator": "=",
            "uid": "prop_is_renovated",
            "default_value": None,
            "range_select_choices": None,
            "placeholder": "Choose an option",
            "selected_value": "",
        },
    ],
    "group_by": "omg_feeds_floorplan_id",
    "result_structures": {
        "prop-details-search-results": {
            "results_table_id": "prop-details-search-results",
            "search_bar_id": "prop-details-search",
            "no_results_message": "No Results Found",
            "no_results_message_class": "text-center",
            "visibility_status": 0,
            "container": {"classes": "prop-details-search-results"},
            "card": {
                "classes": "",
                "header": {"every_item_classes": "", "classes": "", "items": []},
                "body": {
                    "every_item_classes": "",
                    "classes": "",
                    "items": [
                        {
                            "column": "floorplan_name",
                            "classes": "paoc-pro-popup-cust-139881  display-floorplan-details prop-detail-floorplan-name",
                            "prefix": "",
                            "prefix_class": "",
                            "suffix": "",
                            "suffix_class": "",
                            "on_click_action": "none",
                            "open_link_in_new_window": False,
                            "link_destination": "property",
                            "field_groups": "",
                            "custom_text": "",
                        },
                        {
                            "column": "property_virtual_tours",
                            "classes": "prop-details-virtual-tours",
                            "prefix": "",
                            "prefix_class": "",
                            "suffix": "",
                            "suffix_class": "",
                            "on_click_action": "none",
                            "open_link_in_new_window": False,
                            "link_destination": "property",
                            "field_groups": "",
                            "custom_text": "",
                        },
                        {
                            "column": "sqft_commas",
                            "classes": "text-center paoc-pro-popup-cust-139881  display-floorplan-details",
                            "prefix": "",
                            "prefix_class": "",
                            "suffix": "",
                            "suffix_class": "",
                            "on_click_action": "none",
                            "open_link_in_new_window": False,
                            "link_destination": "property",
                            "field_groups": "",
                            "custom_text": "",
                        },
                        {
                            "column": "date_formatted",
                            "classes": "text-center paoc-pro-popup-cust-139881  display-floorplan-details",
                            "prefix": "",
                            "prefix_class": "",
                            "suffix": "",
                            "suffix_class": "",
                            "on_click_action": "none",
                            "open_link_in_new_window": False,
                            "link_destination": "property",
                            "field_groups": "",
                            "custom_text": "",
                        },
                        {
                            "column": "rent_from_price",
                            "classes": "text-right paoc-pro-popup-cust-139881  display-floorplan-details",
                            "prefix": "",
                            "prefix_class": "",
                            "suffix": "",
                            "suffix_class": "",
                            "on_click_action": "none",
                            "open_link_in_new_window": False,
                            "link_destination": "property",
                            "field_groups": "",
                            "custom_text": "",
                        },
                    ],
                },
                "footer": {
                    "every_item_classes": "",
                    "classes": "",
                    "items": [
                        {"column": "rent_formatted", "classes": "hidden", "prefix": "", "prefix_class": "", "suffix": "", "suffix_class": "", "on_click_action": "none", "open_link_in_new_window": False, "link_destination": "property", "field_groups": "", "custom_text": ""},
                        {"column": "move_in_date", "classes": "hidden", "prefix": "", "prefix_class": "", "suffix": "", "suffix_class": "", "on_click_action": "none", "open_link_in_new_window": False, "link_destination": "property", "field_groups": "", "custom_text": ""},
                        {"column": "omg_feeds_floorplan_id", "classes": "hidden floorplan-id", "prefix": "", "prefix_class": "", "suffix": "", "suffix_class": "", "on_click_action": "none", "open_link_in_new_window": False, "link_destination": "property", "field_groups": "", "custom_text": ""},
                    ],
                },
            },
        }
    },
    "results_per_page": 5,
    "current_page": 0,
    "available_results": [],
    "subquery": {},
    "stored_items_ids": [],
    "query_count": 0,
}


@dataclass
class ScrapedUnit:
    building_id: str
    layout_id: str
    type_label: str
    unit_number: str
    availability_date: str | None
    price: int


def now_iso() -> str:
    return datetime.now(tz=TIMEZONE).replace(microsecond=0).isoformat()


def today_iso() -> str:
    return datetime.now(tz=TIMEZONE).date().isoformat()


def is_thursday(iso_date: str) -> bool:
    return datetime.fromisoformat(iso_date).weekday() == 3


def create_unit_id(building_id: str, unit_number: str) -> str:
    raw = f"{building_id}-{unit_number}".lower()
    normalized = []
    last_dash = False
    for char in raw:
      if char.isalnum():
          normalized.append(char)
          last_dash = False
      elif not last_dash:
          normalized.append("-")
          last_dash = True
    return "".join(normalized).strip("-")


def normalize_unit_number(unit_number: str) -> str:
    value = unit_number.strip()
    if value.upper().startswith("MN-") or value.upper().startswith("MS-"):
        return value[3:]
    return value


def normalize_date(value: str | None) -> str | None:
    if not value or value == "1970-01-01":
        return None

    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        return value

    try:
        parsed = datetime.strptime(value, "%m/%d/%Y")
        return parsed.date().isoformat()
    except ValueError:
        return None


def split_type_label(type_label: str) -> tuple[str, str]:
    parts = type_label.strip().split()
    building_id = parts[0] if parts else type_label
    layout_id = " ".join(parts[1:]) if len(parts) > 1 else type_label
    return building_id, layout_id


def post_form(payload: dict[str, str]) -> dict:
    encoded = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(
        AJAX_URL,
        data=encoded,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0",
        },
        method="POST",
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, context=context, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_floorplan_list() -> list[dict[str, str]]:
    floorplans: dict[str, dict[str, str]] = {}

    for page in range(100):
        payload = {**FLOORPLAN_LIST_PAYLOAD, "current_page": page}
        response = post_form(
            {
                "action": "omg_apt_search_main_query",
                "payload": json.dumps(payload, separators=(",", ":")),
            }
        )
        page_items = []
        for item in response.get("apts_result", []):
            floorplan_id = str(item.get("omg_feeds_floorplan_id") or "").strip()
            floorplan_name = str(item.get("floorplan_name") or "").strip()
            if floorplan_id and floorplan_name:
                page_items.append({"floorplanId": floorplan_id, "floorplanName": floorplan_name})

        if not page_items:
            break

        for item in page_items:
            floorplans[item["floorplanId"]] = item

    return list(floorplans.values())


def fetch_floorplan_units(floorplan_id: str) -> list[ScrapedUnit]:
    response = post_form({"action": "floorplan_query", "id": floorplan_id})
    type_label = str(response.get("floorplan_name") or "").strip()
    if not type_label:
        return []

    building_id, layout_id = split_type_label(type_label)
    units: list[ScrapedUnit] = []
    for unit in response.get("query_response", []):
        unit_number = normalize_unit_number(str(unit.get("the_title") or "").strip())
        try:
            price = round(float(unit.get("ra_rent") or ""))
        except ValueError:
            continue
        if not unit_number:
            continue
        units.append(
            ScrapedUnit(
                building_id=building_id,
                layout_id=layout_id,
                type_label=type_label,
                unit_number=unit_number,
                availability_date=normalize_date(unit.get("ra_date_available")),
                price=price,
            )
        )
    return units


def load_dataset() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def sort_units(units: list[dict]) -> list[dict]:
    return sorted(
        units,
        key=lambda unit: (
            unit.get("buildingId", ""),
            unit.get("layoutId", ""),
            unit.get("unitNumber", ""),
        ),
    )


def canonicalize_units(units: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}

    for unit in units:
        normalized_unit_number = normalize_unit_number(str(unit.get("unitNumber") or ""))
        normalized_id = create_unit_id(str(unit.get("buildingId") or ""), normalized_unit_number)
        existing = merged.get(normalized_id)

        if existing is None:
            merged[normalized_id] = {
                **unit,
                "id": normalized_id,
                "unitNumber": normalized_unit_number,
            }
            continue

        snapshots_by_date = {snapshot["date"]: snapshot for snapshot in existing.get("snapshots", [])}
        for snapshot in unit.get("snapshots", []):
            snapshots_by_date[snapshot["date"]] = snapshot

        merged[normalized_id] = {
            **existing,
            **unit,
            "id": normalized_id,
            "unitNumber": normalized_unit_number,
            "availabilityDate": existing.get("availabilityDate") or unit.get("availabilityDate"),
            "snapshots": list(snapshots_by_date.values()),
        }

    return list(merged.values())


def recalculate_dataset(dataset: dict) -> dict:
    latest_snapshot_date = dataset.get("latestSnapshotDate")
    units = []
    for unit in canonicalize_units(dataset.get("units", [])):
        snapshots = sorted(unit.get("snapshots", []), key=lambda item: item["date"])
        first_snapshot = snapshots[0] if snapshots else None
        last_snapshot = snapshots[-1] if snapshots else None
        current_price = last_snapshot["price"] if last_snapshot else None
        initial_price = first_snapshot["price"] if first_snapshot else None
        availability_date = unit.get("availabilityDate") or (first_snapshot["date"] if first_snapshot else None)

        units.append(
            {
                **unit,
                "availabilityDate": availability_date,
                "firstSeen": first_snapshot["date"] if first_snapshot else None,
                "lastSeen": last_snapshot["date"] if last_snapshot else None,
                "currentPrice": current_price,
                "initialPrice": initial_price,
                "changeSinceFirst": (current_price - initial_price) if current_price is not None and initial_price is not None else None,
                "snapshotCount": len(snapshots),
                "status": "active" if last_snapshot and latest_snapshot_date and last_snapshot["date"] == latest_snapshot_date else "inactive",
                "snapshots": snapshots,
            }
        )

    units = sort_units(units)
    dataset["units"] = units
    dataset["totals"] = {
        "units": len(units),
        "activeUnits": sum(1 for unit in units if unit.get("status") == "active"),
        "inactiveUnits": sum(1 for unit in units if unit.get("status") == "inactive"),
        "snapshots": sum(int(unit.get("snapshotCount") or 0) for unit in units),
    }
    return dataset


def merge_snapshot(scraped_units: list[ScrapedUnit], snapshot_date: str) -> dict:
    dataset = load_dataset()
    units_by_id = {
        create_unit_id(str(unit.get("buildingId") or ""), normalize_unit_number(str(unit.get("unitNumber") or ""))): unit
        for unit in canonicalize_units(dataset.get("units", []))
    }
    snapshot_dates = set(dataset.get("snapshotDates", []))
    snapshot_dates.add(snapshot_date)

    dataset["snapshotDates"] = sorted(snapshot_dates)
    dataset["latestSnapshotDate"] = snapshot_date
    dataset["generatedAt"] = now_iso()
    dataset["sourceFile"] = "data/Rent.xlsx"
    dataset["sourceUrl"] = SOURCE_URL

    for scraped in scraped_units:
        normalized_unit_number = normalize_unit_number(scraped.unit_number)
        unit_id = create_unit_id(scraped.building_id, normalized_unit_number)
        existing = units_by_id.get(unit_id)
        new_snapshot = {
            "date": snapshot_date,
            "price": scraped.price,
            "isThursday": is_thursday(snapshot_date),
        }

        if existing is None:
            units_by_id[unit_id] = {
                "id": unit_id,
                "buildingId": scraped.building_id,
                "layoutId": scraped.layout_id,
                "typeLabel": scraped.type_label,
                "unitNumber": normalized_unit_number,
                "availabilityDate": scraped.availability_date or snapshot_date,
                "status": "active",
                "firstSeen": snapshot_date,
                "lastSeen": snapshot_date,
                "currentPrice": scraped.price,
                "initialPrice": scraped.price,
                "changeSinceFirst": 0,
                "snapshotCount": 1,
                "snapshots": [new_snapshot],
            }
            continue

        snapshots = [snap for snap in existing.get("snapshots", []) if snap.get("date") != snapshot_date]
        snapshots.append(new_snapshot)

        existing.update(
            {
                "buildingId": scraped.building_id,
                "layoutId": scraped.layout_id,
                "typeLabel": scraped.type_label,
                "unitNumber": normalized_unit_number,
                "availabilityDate": scraped.availability_date or existing.get("availabilityDate"),
                "snapshots": snapshots,
            }
        )

    dataset["units"] = list(units_by_id.values())
    dataset = recalculate_dataset(dataset)
    DATASET_PATH.write_text(f"{json.dumps(dataset, indent=2)}\n", encoding="utf-8")
    return dataset


def append_log(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def load_status() -> dict:
    if not STATUS_PATH.exists():
        return {
            "state": "idle",
            "lastAttemptedAt": None,
            "lastSuccessfulAt": None,
            "latestSnapshotDate": None,
            "errorMessage": None,
        }

    return json.loads(STATUS_PATH.read_text(encoding="utf-8"))


def write_status(status: dict) -> None:
    STATUS_PATH.write_text(f"{json.dumps(status, indent=2)}\n", encoding="utf-8")


def main() -> None:
    run_started_at = now_iso()
    snapshot_date = today_iso()
    prior_status = load_status()

    try:
        floorplans = fetch_floorplan_list()
        units_by_key: dict[str, ScrapedUnit] = {}
        for floorplan in floorplans:
            for unit in fetch_floorplan_units(floorplan["floorplanId"]):
                units_by_key[f"{unit.building_id}:{unit.unit_number}"] = unit

        scraped_units = sorted(
            units_by_key.values(),
            key=lambda unit: (unit.building_id, unit.layout_id, unit.unit_number),
        )
        dataset = merge_snapshot(scraped_units, snapshot_date)
        result = {
            "ok": True,
            "ranAt": run_started_at,
            "snapshotDate": snapshot_date,
            "scrapedUnitCount": len(scraped_units),
            "trackedUnits": dataset["totals"]["units"],
            "activeUnits": dataset["totals"]["activeUnits"],
        }
        write_status(
            {
                "state": "success",
                "lastAttemptedAt": run_started_at,
                "lastSuccessfulAt": run_started_at,
                "latestSnapshotDate": snapshot_date,
                "errorMessage": None,
            }
        )
        append_log(result)
        print(json.dumps(result, indent=2))
    except Exception as error:  # noqa: BLE001
        result = {
            "ok": False,
            "ranAt": run_started_at,
            "snapshotDate": snapshot_date,
            "error": str(error),
        }
        write_status(
            {
                "state": "failed",
                "lastAttemptedAt": run_started_at,
                "lastSuccessfulAt": prior_status.get("lastSuccessfulAt"),
                "latestSnapshotDate": prior_status.get("latestSnapshotDate"),
                "errorMessage": str(error),
            }
        )
        append_log(result)
        print(json.dumps(result, indent=2))
        raise


if __name__ == "__main__":
    main()
