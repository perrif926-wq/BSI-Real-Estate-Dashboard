import os
from pathlib import Path

import pandas as pd
import streamlit as st


DATA_DIR = Path("data")
DATA_PATH = DATA_DIR / "properties.csv"

REQUIRED_COLUMNS = [
    "property_name",
    "address",
    "property_type",
    "purchase_price",
    "monthly_rent",
    "annual_expenses",
    "occupancy_rate",
    "acquisition_date",
    "notes",
]


def initialize_data_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_PATH.exists():
        empty_df = pd.DataFrame(columns=REQUIRED_COLUMNS)
        empty_df.to_csv(DATA_PATH, index=False)


def load_properties() -> pd.DataFrame:
    initialize_data_file()
    df = pd.read_csv(DATA_PATH)
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    return df


def save_properties(df: pd.DataFrame) -> None:
    df = df.copy()
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    df = df[REQUIRED_COLUMNS]
    df.to_csv(DATA_PATH, index=False)


def calculate_metrics(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["purchase_price"] = pd.to_numeric(result["purchase_price"], errors="coerce").fillna(0)
    result["monthly_rent"] = pd.to_numeric(result["monthly_rent"], errors="coerce").fillna(0)
    result["annual_expenses"] = pd.to_numeric(result["annual_expenses"], errors="coerce").fillna(0)
    result["occupancy_rate"] = pd.to_numeric(result["occupancy_rate"], errors="coerce").fillna(0)
    result["annual_rent"] = result["monthly_rent"] * 12
    result["noi"] = result["annual_rent"] - result["annual_expenses"]
    result["cap_rate"] = (result["noi"] / result["purchase_price"]).replace([float("inf"), -float("inf")], pd.NA)
    return result


st.set_page_config(page_title="Real Estate Dashboard", page_icon="🏠", layout="wide")
st.title("🏠 Real Estate Portfolio Dashboard")
st.caption("A simple, manual-first dashboard for tracking property performance and growth.")

initialize_data_file()
properties_df = load_properties()
properties_df = calculate_metrics(properties_df)

with st.sidebar:
    st.header("Add a property")
    with st.form("property_form"):
        property_name = st.text_input("Property name")
        address = st.text_input("Address")
        property_type = st.selectbox("Property type", ["Residential", "Commercial", "Mixed Use", "Vacation"])
        purchase_price = st.number_input("Purchase price", min_value=0.0, step=1000.0)
        monthly_rent = st.number_input("Monthly rent", min_value=0.0, step=100.0)
        annual_expenses = st.number_input("Annual expenses", min_value=0.0, step=100.0)
        occupancy_rate = st.slider("Occupancy rate (%)", 0, 100, 100)
        acquisition_date = st.date_input("Acquisition date")
        notes = st.text_area("Notes")
        submitted = st.form_submit_button("Save property")

    if submitted:
        new_row = pd.DataFrame([{
            "property_name": property_name,
            "address": address,
            "property_type": property_type,
            "purchase_price": purchase_price,
            "monthly_rent": monthly_rent,
            "annual_expenses": annual_expenses,
            "occupancy_rate": occupancy_rate,
            "acquisition_date": acquisition_date.strftime("%Y-%m-%d"),
            "notes": notes,
        }])
        combined = pd.concat([properties_df, new_row], ignore_index=True)
        save_properties(combined)
        st.success("Property added successfully.")
        st.rerun()

    st.markdown("---")
    st.header("Bulk import")
    uploaded_file = st.file_uploader("Upload CSV", type=["csv"])
    if uploaded_file is not None:
        uploaded_df = pd.read_csv(uploaded_file)
        for col in REQUIRED_COLUMNS:
            if col not in uploaded_df.columns:
                uploaded_df[col] = ""
        uploaded_df = uploaded_df[REQUIRED_COLUMNS]
        combined = pd.concat([properties_df, uploaded_df], ignore_index=True)
        save_properties(combined)
        st.success("CSV imported successfully.")
        st.rerun()

st.subheader("Portfolio overview")
col1, col2, col3, col4 = st.columns(4)
col1.metric("Properties", len(properties_df))
col2.metric("Total monthly rent", f"${properties_df['monthly_rent'].sum():,.0f}")
col3.metric("Estimated annual NOI", f"${properties_df['noi'].sum():,.0f}")
col4.metric("Average occupancy", f"{properties_df['occupancy_rate'].mean():,.0f}%")

st.markdown("---")

left, right = st.columns(2)
with left:
    st.subheader("Rent by property")
    rent_chart = properties_df[["property_name", "monthly_rent"]].copy()
    if not rent_chart.empty:
        st.bar_chart(rent_chart.set_index("property_name"))
    else:
        st.info("Add a property to see the chart.")

with right:
    st.subheader("Occupancy by property")
    occupancy_chart = properties_df[["property_name", "occupancy_rate"]].copy()
    if not occupancy_chart.empty:
        st.bar_chart(occupancy_chart.set_index("property_name"))
    else:
        st.info("Add a property to see the chart.")

st.markdown("---")
st.subheader("Property table")
show_df = properties_df[[
    "property_name",
    "address",
    "property_type",
    "purchase_price",
    "monthly_rent",
    "annual_expenses",
    "occupancy_rate",
    "annual_rent",
    "noi",
    "cap_rate",
    "notes",
]].copy()
show_df["purchase_price"] = show_df["purchase_price"].map(lambda x: f"${x:,.0f}" if pd.notna(x) else "")
show_df["monthly_rent"] = show_df["monthly_rent"].map(lambda x: f"${x:,.0f}" if pd.notna(x) else "")
show_df["annual_expenses"] = show_df["annual_expenses"].map(lambda x: f"${x:,.0f}" if pd.notna(x) else "")
show_df["annual_rent"] = show_df["annual_rent"].map(lambda x: f"${x:,.0f}" if pd.notna(x) else "")
show_df["noi"] = show_df["noi"].map(lambda x: f"${x:,.0f}" if pd.notna(x) else "")
show_df["cap_rate"] = show_df["cap_rate"].map(lambda x: f"{x:.2%}" if pd.notna(x) else "")
show_df["occupancy_rate"] = show_df["occupancy_rate"].map(lambda x: f"{x:.0f}%" if pd.notna(x) else "")
st.dataframe(show_df, use_container_width=True)
