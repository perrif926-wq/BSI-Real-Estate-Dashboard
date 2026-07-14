# Real Estate Portfolio Dashboard

A simple Streamlit dashboard for tracking real estate properties and their performance.

The live shared dashboard (static frontend + Node/Postgres backend in `backend/`) is deployed at https://bsi-real-estate-dashboard.onrender.com/.

## Features

- Add properties manually through a form
- Upload properties in bulk via CSV
- View key metrics such as total monthly rent, estimated annual NOI, and average occupancy
- Visualize rent and occupancy by property
- Keep data in a local CSV file so it is easy to update

## Run locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the app:
   ```bash
   streamlit run app.py
   ```

Branding:
- Replace `logo.svg` in the project root with your own SVG to white-label the dashboard header.

Replacing logo from the UI:
- You can upload a new logo from the dashboard header: click "Change logo" and select an image (SVG or PNG). The image is kept locally in your browser.
- To revert to the original, click "Reset logo".

Notes:
- SVG is preferred for best sharpness. PNG with transparency also works.

## Suggested next steps

- Add mortgage, taxes, and insurance fields
- Track cash flow month by month
- Connect to QuickBooks, Excel, or Airbnb data
- Add a property detail view and filtering by city or type
