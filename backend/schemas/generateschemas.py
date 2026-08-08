from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class GenerateRequest(BaseModel):
    message: str
    sessionid: Optional[str] = None
    planningstate: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None
    itinerary: Optional[Dict[str, Any]] = None
    tripid: Optional[int] = None
    currency: Optional[str] = None  # locked by the UI once chosen
