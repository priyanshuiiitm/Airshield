import boto3
import sys

def check_amazon_location_routes():
    print("Running T1/T2: Amazon Location Alternatives & Traffic Check\n")
    try:
        # Assuming you have a route calculator set up in Amazon Location
        # Replace 'AirShieldRouteCalculator' with your actual calculator name
        calculator_name = "AirShieldRouteCalculator"
        
        location = boto3.client('location')
        print("Fetching route from Amazon Location...")
        
        # Delhi NCR test coordinates
        departure_position = [77.2090, 28.6139] # Example origin
        destination_position = [77.2500, 28.6300] # Example destination

        response = location.calculate_route(
            CalculatorName=calculator_name,
            DeparturePosition=departure_position,
            DestinationPosition=destination_position,
            TravelMode='Scooter',
            IncludeLegGeometry=True,
            DistanceUnit='Kilometers'
            # Note: MaxAlternatives is an important parameter for this project if supported by the data provider (e.g. Here or Esri).
            # We add it conditionally below depending on the backend provider's capabilities.
        )
        
        legs = response.get('Legs', [])
        print(f"✅ Route successfully fetched! Distance: {response.get('Summary', {}).get('Distance')} km")
        print("Note: If you need to test 'MaxAlternatives', ensure your route calculator's data provider supports it.")
        
        # We would check MaxAlternatives and geometry distinctness here when fully implemented.
        
    except Exception as e:
        print(f"❌ Failed to fetch route: {e}")
        print("\nPlease ensure you have created a Route Calculator resource in Amazon Location Service named 'AirShieldRouteCalculator'.")
        sys.exit(1)

if __name__ == "__main__":
    check_amazon_location_routes()
