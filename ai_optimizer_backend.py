from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json
import os

app = FastAPI()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3")

class OptimizationRequest(BaseModel):
    army: list
    defense: list
    buildings: list
    stats: dict
    metadata: dict

@app.post("/optimize")
async def optimize(request: OptimizationRequest):
    prompt = f"""
You are a Command & Conquer: Tiberium Alliances strategy expert.
Optimize the army formation to maximize damage to the Construction Yard (CY) and Defense Facility (DF).

Target Defense Layout (9x8):
{json.dumps(request.defense)}

Target Buildings Layout (9x8):
{json.dumps(request.buildings)}

Current Army Layout (9x4):
{json.dumps(request.army)}

Current Simulation Stats:
{json.dumps(request.stats)}

Unit Metadata:
{json.dumps(request.metadata)}

Goal: Maximize damage to CY and DF while keeping repair costs low.
The army grid is 9 columns (0-8) and 4 rows (0-3).

Provide a new army layout as a JSON list of units with 'id', 'x', and 'y' fields.
Respond ONLY with the JSON.
"""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }, timeout=60.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Ollama error")
            
            result = response.json()
            # The model might return the JSON inside a 'response' field or similar depending on the prompt
            optimized_army = json.loads(result.get("response", "[]"))
            return {"optimized_army": optimized_army}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
