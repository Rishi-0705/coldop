from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil
import os
import warnings
from typing import Dict, Any

warnings.filterwarnings('ignore')

app = FastAPI(title="ColdOps CV Backend")

try:
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
except ImportError:
    model = None

@app.post("/analyze")
async def analyze_cooler(file: UploadFile = File(...)) -> Dict[str, Any]:
    if model is None:
        raise HTTPException(status_code=500, detail="Ultralytics YOLOv8 is not installed. Please install requirements.")

    # Save uploaded file temporarily
    tmp_path = f"temp_{file.filename}"
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Run inference
        results = model(tmp_path, verbose=False)
        
        count = 0
        for r in results:
            count += len(r.boxes)
            
        return {
            "count": count,
            "success": True,
            "engine": "YOLOv8"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
