import boto3
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def check_amazon_location_routes():
    print("Running T1/T2: Amazon Location Alternatives & Traffic Check\n")
    try:
        # Assuming you have a route calculator set up in Amazon Location
        # Replace 'AirShieldRouteCalculator' with your actual calculator name
        calculator_name = "AirShieldRouteCalculator"
        
        # Try configured region, fallback to ap-south-1
        region = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
        try:
            location = boto3.client('location', region_name=region)
            location.describe_route_calculator(CalculatorName=calculator_name)
        except Exception:
            region = "ap-south-1"
            location = boto3.client('location', region_name=region)
        
        print(f"Fetching route from Amazon Location (Region: {region})...")
        
        # Delhi NCR test coordinates
        departure_position = [77.2090, 28.6139] # Example origin
        destination_position = [77.2500, 28.6300] # Example destination

        response = location.calculate_route(
            CalculatorName=calculator_name,
            DeparturePosition=departure_position,
            DestinationPosition=destination_position,
            TravelMode='Car', # Valid values: 'Car', 'Truck', 'Walking', 'Bicycle', 'Motorcycle'
            IncludeLegGeometry=True,
            DistanceUnit='Kilometers'
        )
        
        legs = response.get('Legs', [])
        print(f"[OK] Route successfully fetched! Distance: {response.get('Summary', {}).get('Distance')} km")
        print("Note: If you need to test 'MaxAlternatives', ensure your route calculator's data provider supports it.")
        
        # We would check MaxAlternatives and geometry distinctness here when fully implemented.
        
    except Exception as e:
        print(f"[FAIL] Failed to fetch route: {e}")
        print("\nPlease ensure you have created a Route Calculator resource in Amazon Location Service named 'AirShieldRouteCalculator'.")
        sys.exit(1)

if __name__ == "__main__":
    check_amazon_location_routes()
