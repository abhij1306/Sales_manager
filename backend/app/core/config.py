"""
Configuration loader - Loads .env file for local development
"""
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Load .env file manually
def load_env():
    """Load environment variables from .env file"""
    # Try multiple possible locations
    possible_paths = [
        Path(__file__).parent.parent.parent.parent / '.env',  # Actual Project Root (SenstoSales)
        Path(__file__).parent.parent.parent / '.env',  # Backend Root
        Path.cwd() / '.env',  # Current directory
        Path.cwd().parent / '.env', # Parent of CWD
    ]
    
    for env_path in possible_paths:
        if env_path.exists():
            logger.info(f"Loading .env from: {env_path}")
            with open(env_path, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    # Parse key=value
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        # Remove quotes if present
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]
                        os.environ[key] = value
                        # Mask sensitive keys
                        if "KEY" in key or "SECRET" in key or "PASSWORD" in key:
                            masked_value = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "***"
                            # print(f"  Loaded: {key} ({masked_value})")
                        else:
                            # print(f"  Loaded: {key} ({value})")
                            pass
            return
    
    logger.warning("No .env file found in paths: " + str([str(p) for p in possible_paths]))

# Load on import
load_env()
