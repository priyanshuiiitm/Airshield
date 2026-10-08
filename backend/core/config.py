import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Buffer in minutes allowed over the fastest route
    DEFAULT_BUFFER_MIN = 5
    
    # Thresholds for classification
    REDUCTION_THRESHOLD = 0.15 # 15%
    
    # Financial rewards (simulated)
    REWARD_AVOIDABLE = 3
    BENEFIT_UNAVOIDABLE = 5
    
    # API Keys
    OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY")
    
    # Toggle to use Mock AWS until account is activated
    USE_MOCK_AWS = True
