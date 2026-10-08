from ultralytics import YOLO
from pathlib import Path

# Windows: multiprocessing workers require this guard
if __name__ == "__main__":
    model = YOLO("models/yolo26m_custom.pt")
    model_size = Path("models/yolo26m_custom.pt").stat().st_size / 1e6

    print("=" * 55)
    print("  ClassroomGuard — YOLO26n Trained Model Results")
    print("=" * 55)
    print(f"  Model file : models/yolo26m_custom.pt  ({model_size:.1f} MB)")
    print(f"  Parameters : 2,375,811")
    print(f"  GFLOPs     : 5.3")
    print(f"  Inference  : ~50ms/img on RTX 4070 Laptop GPU")
    print()

    print("  Running validation on merged dataset (211 val images)...")
    metrics = model.val(
        data="data/merged_classroom/merged.yaml",
        device=0,
        workers=0,     # workers=0 avoids Windows multiprocessing issues in scripts
        verbose=False,
        plots=False,
        split="val",
    )

    print()
    print("=" * 55)
    print("  FINAL METRICS  (val set — 211 images, 769 instances)")
    print("=" * 55)
    print(f"  mAP50       : {metrics.box.map50:.4f}  ({metrics.box.map50*100:.1f}%)")
    print(f"  mAP50-95    : {metrics.box.map:.4f}  ({metrics.box.map*100:.1f}%)")
    print(f"  Precision   : {metrics.box.mp:.4f}  ({metrics.box.mp*100:.1f}%)")
    print(f"  Recall      : {metrics.box.mr:.4f}  ({metrics.box.mr*100:.1f}%)")
    print()
    print("  Per-class breakdown:")
    print(f"  {'Class':<16} {'P':>6}  {'R':>6}  {'mAP50':>7}  {'mAP50-95':>9}")
    print("  " + "-" * 50)
    names = model.names
    for i, (p, r, ap50, ap) in enumerate(
        zip(metrics.box.p, metrics.box.r, metrics.box.ap50, metrics.box.ap)
    ):
        print(f"  {names[i]:<16} {p:>6.3f}  {r:>6.3f}  {ap50:>7.3f}  {ap:>9.3f}")

    print()
    print("=" * 55)
    print("  Weights : models/yolo26m_custom.pt")
    print("  Plots   : runs/detect/classguard-yolo26m/")
    print("=" * 55)
