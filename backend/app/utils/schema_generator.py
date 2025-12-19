"""
JSON Schema Generator for LLM Function Calling
Generates OpenAPI-compatible schemas from Pydantic models
"""
from typing import Dict, Any, Type
from pydantic import BaseModel
import json


def generate_schema_for_model(model: Type[BaseModel]) -> Dict[str, Any]:
    """
    Generate JSON schema from Pydantic model
    Compatible with OpenAI function calling format
    """
    schema = model.model_json_schema()
    
    # Convert to OpenAI function calling format
    return {
        "name": model.__name__,
        "description": model.__doc__ or f"Schema for {model.__name__}",
        "parameters": {
            "type": "object",
            "properties": schema.get("properties", {}),
            "required": schema.get("required", [])
        }
    }


def generate_all_schemas() -> Dict[str, Dict[str, Any]]:
    """
    Generate schemas for all API models
    Used for LLM training and function calling
    """
    from app.models import (
        DCCreate, InvoiceCreate, POHeader, POItem,
        EnhancedInvoiceCreate
    )
    
    schemas = {}
    
    # DC Schemas
    schemas["create_dc"] = generate_schema_for_model(DCCreate)
    
    # Invoice Schemas
    try:
        from app.routers.invoice import EnhancedInvoiceCreate
        schemas["create_invoice"] = generate_schema_for_model(EnhancedInvoiceCreate)
    except ImportError:
        pass
    
    # PO Schemas
    schemas["po_header"] = generate_schema_for_model(POHeader)
    schemas["po_item"] = generate_schema_for_model(POItem)
    
    return schemas


def export_schemas_to_file(output_path: str = "schemas/api_schemas.json"):
    """
    Export all schemas to JSON file for LLM training
    """
    import os
    
    schemas = generate_all_schemas()
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(schemas, f, indent=2)
    
    print(f"✅ Exported {len(schemas)} schemas to {output_path}")
    return output_path


if __name__ == "__main__":
    # Generate schemas for LLM integration
    export_schemas_to_file()
