import requests
import sys
import os
from dotenv import load_dotenv

def check_openaq_coverage():
    load_dotenv()
    print("Running T3: OpenAQ Coverage Check (Delhi NCR)\n")
    
    # We query for locations within a radius of New Delhi (lat: 28.6139, lon: 77.2090)
    # OpenAQ v3 API endpoint for locations
    url = "https://api.openaq.org/v3/locations"
    
    params = {
        "coordinates": "28.6139,77.2090",
        "radius": 25000, # 25km radius
        "parameters": "pm25",
        "limit": 100
    }
    
    api_key = os.getenv("OPENAQ_API_KEY")
    headers = {"X-API-Key": api_key} if api_key else {}
    
    try:
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            data = response.json()
            locations = data.get('results', [])
            print(f"✅ Found {len(locations)} active monitoring stations reporting PM2.5 within 25km of Central Delhi.")
            
            if len(locations) >= 5:
                print("Coverage is SUFFICIENT for the model (>= 5 stations).")
            else:
                print("⚠️ Coverage is WEAK (< 5 stations). Interpolation may have low confidence.")
                
            for loc in locations[:5]:
                print(f" - Station: {loc.get('name')} (ID: {loc.get('id')})")
                
        else:
            print(f"❌ Failed to query OpenAQ. Status Code: {response.status_code}")
            print(response.text)
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Exception querying OpenAQ: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_openaq_coverage()
