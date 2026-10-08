import os
import cv2
import glob
import random

def extract_frames(video_path, output_dir, max_frames=50, frame_interval=30):
    """
    Extracts frames from a video file for training/annotation.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file: {video_path}")
        return

    video_name = os.path.splitext(os.path.basename(video_path))[0]
    
    frame_count = 0
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_count % frame_interval == 0:
            output_path = os.path.join(output_dir, f"{video_name}_frame_{frame_count}.jpg")
            cv2.imwrite(output_path, frame)
            saved_count += 1
            
            if saved_count >= max_frames:
                break
                
        frame_count += 1
        
    cap.release()
    print(f"Extracted {saved_count} frames from {video_name}")

def prepare_dataset(source_dir, output_root, split_ratio=0.8):
    """
    Finds video files in source_dir and prepares a dataset for YOLOv8 training.
    """
    video_files = glob.glob(os.path.join(source_dir, "*.mp4"))
    if not video_files:
        print(f"No .mp4 files found in {source_dir}")
        return
        
    print(f"Found {len(video_files)} video files in {source_dir}")
    
    # Shuffle for random train/test split
    random.shuffle(video_files)
    
    split_index = int(len(video_files) * split_ratio)
    train_videos = video_files[:split_index]
    test_videos = video_files[split_index:]
    
    train_dir = os.path.join(output_root, "images", "train")
    test_dir = os.path.join(output_root, "images", "test")
    
    # Process train videos
    print("\nProcessing Train Videos...")
    for video in train_videos:
        extract_frames(video, train_dir, max_frames=10, frame_interval=150) # Extract fewer frames for demo
        
    # Process test videos
    print("\nProcessing Test Videos...")
    for video in test_videos:
        extract_frames(video, test_dir, max_frames=10, frame_interval=150)
        
    print(f"\nDataset preparation complete! Frames saved to: {output_root}")
    print("Next step: Annotate the extracted frames using CVAT or Roboflow before running YOLOv8 training.")

if __name__ == "__main__":
    SOURCE_DIRECTORY = "E:\\"
    OUTPUT_DATASET = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "dataset")
    
    # Run the preparation script
    prepare_dataset(SOURCE_DIRECTORY, OUTPUT_DATASET)
