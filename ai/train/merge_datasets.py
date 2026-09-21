import os
import shutil
import yaml
from pathlib import Path
import argparse

# The master unified classes we want to use
MASTER_CLASSES = {
    0: "person",
    1: "cell_phone",
    2: "calculator",
    3: "cheat_sheet",
    4: "earbuds",
    5: "high_attention",
    6: "low_attention"
}
REVERSE_MASTER = {v: k for k, v in MASTER_CLASSES.items()}

# Mapping variations of class names from downloaded datasets to our master names
CLASS_ALIASES = {
    "cell-phones": "cell_phone",
    "mobile": "cell_phone",
    "Mobile_Phone": "cell_phone",
    "High Attention": "high_attention",
    "Low Attention": "low_attention",
    "Calculator": "calculator",
}

def get_class_map(dataset_yaml_path):
    with open(dataset_yaml_path, 'r') as f:
        data = yaml.safe_load(f)
    
    dataset_names = data.get('names', [])
    if isinstance(dataset_names, dict):
        # some versions use a dictionary
        dataset_names = [dataset_names[i] for i in range(len(dataset_names))]
        
    class_map = {}
    for old_id, old_name in enumerate(dataset_names):
        normalized_name = CLASS_ALIASES.get(old_name, old_name.lower())
        if normalized_name in REVERSE_MASTER:
            class_map[old_id] = REVERSE_MASTER[normalized_name]
        else:
            print(f"Warning: Unknown class '{old_name}' found. Ignoring...")
    return class_map

def merge_dataset(source_dir, dest_dir):
    source_dir = Path(source_dir)
    dest_dir = Path(dest_dir)
    
    yaml_path = source_dir / "data.yaml"
    if not yaml_path.exists():
        print(f"Skipping {source_dir}: No data.yaml found.")
        return
        
    class_map = get_class_map(yaml_path)
    print(f"\nProcessing {source_dir.name}...")
    print(f"Class mapping: {class_map}")
    
    for split in ['train', 'valid', 'test']:
        img_src = source_dir / split / "images"
        lbl_src = source_dir / split / "labels"
        
        if not img_src.exists():
            continue
            
        # Target directories (convert valid -> val for our structure)
        dest_split = 'val' if split == 'valid' else split
        if dest_split == 'test': 
            dest_split = 'val' # YOLOv8 uses val for testing during training
            
        img_dest = dest_dir / "images" / dest_split
        lbl_dest = dest_dir / "labels" / dest_split
        
        img_dest.mkdir(parents=True, exist_ok=True)
        lbl_dest.mkdir(parents=True, exist_ok=True)
        
        # Copy and remap
        copied = 0
        for img_file in img_src.glob("*.*"):
            lbl_file = lbl_src / (img_file.stem + ".txt")
            if not lbl_file.exists():
                continue
                
            # Read and remap label
            new_lines = []
            with open(lbl_file, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts: continue
                    old_id = int(parts[0])
                    if old_id in class_map:
                        parts[0] = str(class_map[old_id])
                        new_lines.append(" ".join(parts))
                        
            if new_lines:
                # Only copy if there are valid bounding boxes
                dest_img_path = img_dest / f"{source_dir.name}_{img_file.name}"
                dest_lbl_path = lbl_dest / f"{source_dir.name}_{lbl_file.name}"
                
                shutil.copy2(img_file, dest_img_path)
                with open(dest_lbl_path, 'w') as f:
                    f.write("\n".join(new_lines) + "\n")
                copied += 1
                
        print(f"  {split}: Copied {copied} images/labels")

def generate_master_yaml(dest_dir):
    dest_dir = Path(dest_dir)
    yaml_path = dest_dir / "data.yaml"
    
    yaml_content = f"""path: {dest_dir.resolve()}
train: images/train
val: images/val

nc: {len(MASTER_CLASSES)}
names:
"""
    for class_id, class_name in sorted(MASTER_CLASSES.items()):
        yaml_content += f"  {class_id}: {class_name}\n"
        
    with open(yaml_path, 'w') as f:
        f.write(yaml_content)
    print(f"\nMaster data.yaml generated at {yaml_path}")

def main():
    parser = argparse.ArgumentParser(description="Merge multiple YOLO datasets into one")
    parser.add_argument("--data-dir", default="../data", help="Target unified data directory")
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    
    # Clean previous merge (careful!)
    for d in ['images', 'labels']:
        p = data_dir / d
        if p.exists():
            shutil.rmtree(p)
            
    # Also delete any lingering cache files in case they were left behind elsewhere
    for cache_file in data_dir.rglob("*.cache"):
        cache_file.unlink()
    
    # Find all downloaded dataset folders in the data directory
    datasets = [d for d in data_dir.iterdir() if d.is_dir() and (d / "data.yaml").exists()]
    
    for d in datasets:
        merge_dataset(d, data_dir)
        
    generate_master_yaml(data_dir)
    print("\nMerge complete! You can now run:")
    print("python train/train_custom.py --epochs 100 --batch 16")

if __name__ == "__main__":
    main()
