import sys
import json
import warnings

# Suppress warnings from ultralytics to keep stdout clean for JSON parsing
warnings.filterwarnings('ignore')

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"error": "Ultralytics YOLOv8 is not installed. Please run 'pip install ultralytics'."}))
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    
    try:
        # Initialize YOLO model (nano model for speed). It will download yolov8n.pt on first run.
        model = YOLO('yolov8n.pt')
        
        # Run inference on the image
        # verbose=False prevents YOLO from printing its progress to stdout
        results = model(image_path, verbose=False)
        
        # Count all detected objects. Since the user uploads a photo specifically of cokes, 
        # any detected object (bottle, cup, can, person) that meets the confidence threshold
        # is likely what they want counted.
        # But we can also filter for 'bottle' (class 39) or 'cup' (class 41) just in case.
        # For maximum robustness in a hackathon, we'll count all detected distinct objects
        # because the image context is already assumed to be the cold room inventory.
        
        count = 0
        for r in results:
            # r.boxes contains all bounding boxes detected in this image
            # length of r.boxes is the number of detected objects
            count += len(r.boxes)
                
        # Return exact JSON output expected by Node.js
        print(json.dumps({
            "count": count, 
            "success": True,
            "engine": "YOLOv8"
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
