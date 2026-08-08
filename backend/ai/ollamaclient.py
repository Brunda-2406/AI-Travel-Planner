import requests
import logging
from ..config import settings
from ..utils.retry import with_retry

logger = logging.getLogger("ollama_client")

class OllamaClient:
    @staticmethod
    @with_retry(max_attempts=3, backoff_factor=2.0)
    def call_ollama(prompt: str) -> str:
        if not settings.USE_OLLAMA:
            logger.info("Ollama is disabled (USE_OLLAMA=False)")
            return ""

        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "think": False,  # qwen3 outputs thinking tokens by default; disable for clean JSON
        }
        
        try:
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except Exception as e:
            logger.error(f"Error calling Ollama: {e}")
            return ""
