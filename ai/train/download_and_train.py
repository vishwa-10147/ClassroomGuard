import os
from roboflow import Roboflow
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Download dataset from Roboflow and train YOLOv8")
    parser.add_argument("--api-key", required=True, help="Your Roboflow API Key")
    args = parser.parse_args()

    print("Authenticating with Roboflow...")
    rf = Roboflow(api_key=args.api_key)
    
    print("Downloading Cheating Detection Dataset...")
    project = rf.workspace("computervisionprojects").project("classroom-cell-phone-detection")
    
    data_dir = str(Path("../data").resolve())
    dataset = None
    
    # Not all versions are exported in YOLOv8 format on Roboflow, try the latest ones
    for v_num in [20, 18, 17, 16, 15, 14, 13, 12, 11, 7]:
        try:
            print(f"Trying version {v_num}...")
            v_dir = data_dir + f"_{v_num}"
            version = project.version(v_num)
            dataset = version.download("yolov8", location=v_dir)
            break
        except Exception as e:
            print(f"Version {v_num} failed: {e}")
            
    if not dataset:
        raise RuntimeError("Failed to download any version of the dataset in YOLOv8 format.")
    
    print(f"Dataset downloaded successfully to {data_dir}!")
    
    # Patch data.yaml to rename 'cell-phones' to 'cell_phone' so it matches our system
    yaml_path = Path(dataset.location) / "data.yaml"
    if yaml_path.exists():
        content = yaml_path.read_text()
        content = content.replace("cell-phones", "cell_phone")
        yaml_path.write_text(content)
        
    print(f"Dataset YAML file is located at: {yaml_path}")
    
    print("\nStarting YOLOv8 Fine-tuning...")
    from ultralytics import YOLO
    
    # Initialize YOLO model
    model = YOLO("yolov8m.pt")
    
    # Run training
    results = model.train(
        data=str(yaml_path),
        epochs=100,
        batch=16,
        imgsz=640,
        device="0",
        workers=4,
        patience=20,
        save=True,
        save_period=10,
        plots=True,
        verbose=True,
    )
    
    print("Training complete! The best model is saved in the runs/ directory.")
    
    # Save a copy to models directory
    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if best_pt.exists():
        output = Path("models") / "yolov8m_custom.pt"
        output.parent.mkdir(exist_ok=True)
        import shutil
        shutil.copy(best_pt, output)
        print(f"Custom model automatically deployed to {output}!")

if __name__ == "__main__":
    main()
