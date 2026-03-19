type AjaxFloorplanResult = {
  omg_feeds_floorplan_id?: string;
  floorplan_name?: string;
};

type AjaxFloorplanListResponse = {
  apts_result?: AjaxFloorplanResult[];
};

type AjaxUnitResult = {
  the_title?: string;
  ra_rent?: string;
  ra_date_available?: string;
};

type AjaxFloorplanDetailResponse = {
  floorplan_name?: string;
  query_response?: AjaxUnitResult[];
};

type ScrapedRentUnit = {
  buildingId: string;
  layoutId: string;
  typeLabel: string;
  unitNumber: string;
  availabilityDate: string | null;
  price: number;
};

const AJAX_URL = "https://verisresidential.com/wp-admin/admin-ajax.php";

const FLOORPLAN_LIST_PAYLOAD = {
  index_table: "omg_apt_idx",
  default_order: [{ order_column: "apt_id", order_direction: "desc" }],
  environment: {
    page_id: "1664",
    custom_post_type: "property_id",
  },
  facets: [
    {
      slug: "ra_bedrooms",
      slug_max: false,
      action: "filter",
      facet: "select",
      operator: "=",
      uid: "bedrooms",
      default_value: null,
      range_select_choices: null,
      placeholder: "Choose an option",
      selected_value: "",
    },
    {
      slug: false,
      slug_max: false,
      action: "sort",
      facet: "select",
      operator: "=",
      uid: "prop_apts_sort",
      default_value: null,
      range_select_choices: null,
      placeholder: "Choose an option",
      selected_value: "",
      sort_items: [
        {
          facet_sort_item_label: "Sqft",
          facet_sort_item_field: "apt_id",
          facet_sort_item_direction: "asc",
          minmax: "0",
        },
        {
          facet_sort_item_label: "Move in date",
          facet_sort_item_field: "apt_id",
          facet_sort_item_direction: "desc",
          minmax: "0",
        },
        {
          facet_sort_item_label: "Rent",
          facet_sort_item_field: "apt_id",
          facet_sort_item_direction: "asc",
          minmax: "0",
        },
      ],
    },
    {
      slug: "omg_feeds_voyager_property_code",
      slug_max: false,
      action: "filter",
      facet: "multi_select",
      operator: "IN",
      uid: "prop_voyager_property_code",
      default_value: null,
      range_select_choices: null,
      placeholder: "",
      selected_value: "",
    },
    {
      slug: "is_renovated",
      slug_max: false,
      action: "filter",
      facet: "select",
      operator: "=",
      uid: "prop_is_renovated",
      default_value: null,
      range_select_choices: null,
      placeholder: "Choose an option",
      selected_value: "",
    },
  ],
  group_by: "omg_feeds_floorplan_id",
  result_structures: {
    "prop-details-search-results": {
      results_table_id: "prop-details-search-results",
      search_bar_id: "prop-details-search",
      no_results_message: "No Results Found",
      no_results_message_class: "text-center",
      visibility_status: 0,
      container: {
        classes: "prop-details-search-results",
      },
      card: {
        classes: "",
        header: {
          every_item_classes: "",
          classes: "",
          items: [],
        },
        body: {
          every_item_classes: "",
          classes: "",
          items: [
            {
              column: "floorplan_name",
              classes: "paoc-pro-popup-cust-139881  display-floorplan-details prop-detail-floorplan-name",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "property_virtual_tours",
              classes: "prop-details-virtual-tours",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "sqft_commas",
              classes: "text-center paoc-pro-popup-cust-139881  display-floorplan-details",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "date_formatted",
              classes: "text-center paoc-pro-popup-cust-139881  display-floorplan-details",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "rent_from_price",
              classes: "text-right paoc-pro-popup-cust-139881  display-floorplan-details",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
          ],
        },
        footer: {
          every_item_classes: "",
          classes: "",
          items: [
            {
              column: "rent_formatted",
              classes: "hidden",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "move_in_date",
              classes: "hidden",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
            {
              column: "omg_feeds_floorplan_id",
              classes: "hidden floorplan-id",
              prefix: "",
              prefix_class: "",
              suffix: "",
              suffix_class: "",
              on_click_action: "none",
              open_link_in_new_window: false,
              link_destination: "property",
              field_groups: "",
              custom_text: "",
            },
          ],
        },
      },
    },
  },
  results_per_page: 5,
  current_page: 0,
  available_results: [],
  subquery: {},
  stored_items_ids: [],
  query_count: 0,
};

function getRequestHeaders() {
  return {
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "x-requested-with": "XMLHttpRequest",
  };
}

function normalizeDate(value: string | undefined) {
  if (!value || value === "1970-01-01") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  return `${match[3]}-${match[1]}-${match[2]}`;
}

function splitTypeLabel(typeLabel: string) {
  const parts = typeLabel.trim().split(/\s+/);
  return {
    buildingId: parts[0] ?? typeLabel,
    layoutId: parts.slice(1).join(" ") || typeLabel,
  };
}

async function postForm<T>(params: URLSearchParams): Promise<T> {
  const response = await fetch(AJAX_URL, {
    method: "POST",
    headers: getRequestHeaders(),
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Veris AJAX request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchFloorplanList() {
  const params = new URLSearchParams();
  params.set("action", "omg_apt_search_main_query");
  params.set("payload", JSON.stringify(FLOORPLAN_LIST_PAYLOAD));

  const response = await postForm<AjaxFloorplanListResponse>(params);

  return (response.apts_result ?? [])
    .map((item) => ({
      floorplanId: item.omg_feeds_floorplan_id?.trim() ?? "",
      floorplanName: item.floorplan_name?.trim() ?? "",
    }))
    .filter((item) => item.floorplanId && item.floorplanName);
}

async function fetchFloorplanUnits(floorplanId: string): Promise<ScrapedRentUnit[]> {
  const params = new URLSearchParams();
  params.set("action", "floorplan_query");
  params.set("id", floorplanId);

  const response = await postForm<AjaxFloorplanDetailResponse>(params);
  const typeLabel = response.floorplan_name?.trim() ?? "";

  if (!typeLabel) {
    return [];
  }

  const { buildingId, layoutId } = splitTypeLabel(typeLabel);

  return (response.query_response ?? [])
    .map((unit) => {
      const unitNumber = unit.the_title?.trim() ?? "";
      const price = Number(unit.ra_rent ?? "");

      if (!unitNumber || !Number.isFinite(price)) {
        return null;
      }

      return {
        buildingId,
        layoutId,
        typeLabel,
        unitNumber,
        availabilityDate: normalizeDate(unit.ra_date_available),
        price: Math.round(price),
      };
    })
    .filter((unit): unit is ScrapedRentUnit => unit !== null);
}

export async function scrapeRentUnits() {
  const floorplans = await fetchFloorplanList();

  if (!floorplans.length) {
    throw new Error("Veris returned no floorplans for The BLVD Collection");
  }

  const unitsByKey = new Map<string, ScrapedRentUnit>();

  for (const floorplan of floorplans) {
    const units = await fetchFloorplanUnits(floorplan.floorplanId);

    for (const unit of units) {
      unitsByKey.set(`${unit.buildingId}:${unit.unitNumber}`, unit);
    }
  }

  return [...unitsByKey.values()].sort((left, right) => {
    if (left.buildingId !== right.buildingId) {
      return left.buildingId.localeCompare(right.buildingId);
    }

    if (left.layoutId !== right.layoutId) {
      return left.layoutId.localeCompare(right.layoutId);
    }

    return left.unitNumber.localeCompare(right.unitNumber, undefined, { numeric: true });
  });
}
