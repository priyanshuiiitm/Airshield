import boto3
from backend.core.config import Config

class Route:
    def __init__(self, route_id, duration_min, distance_km, segments):
        self.route_id = route_id
        self.duration = duration_min # in minutes
        self.distance = distance_km
        # Segments: list of (lat, lon, segment_duration)
        self.segments = segments
        self.exposure = None

def get_routes(pickup_lat, pickup_lon, drop_lat, drop_lon):
    """
    Fetches routes from Amazon Location. 
    Uses Mock data if AWS account is not yet active.
    """
    if Config.USE_MOCK_AWS:
        # Return mock distinct routes
        # Route 1: Fastest but goes through center
        route1 = Route(
            route_id="R1_FAST",
            duration_min=24,
            distance_km=12.5,
            segments=[
                (28.61, 77.20, 12),
                (28.62, 77.21, 12)
            ]
        )
        # Route 2: Safer but slightly longer
        route2 = Route(
            route_id="R2_SAFER",
            duration_min=26,
            distance_km=13.0,
            segments=[
                (28.59, 77.18, 13),
                (28.60, 77.17, 13)
            ]
        )
        # Route 3: Too slow
        route3 = Route(
            route_id="R3_SLOW",
            duration_min=32,
            distance_km=15.0,
            segments=[
                (28.57, 77.15, 16),
                (28.58, 77.16, 16)
            ]
        )
        return [route1, route2, route3]
    
    # Real AWS Boto3 Implementation (Stubbed for now)
    location = boto3.client('location')
    # This would call calculate_routes, extract LegGeometry, and build Route objects.
    return []
