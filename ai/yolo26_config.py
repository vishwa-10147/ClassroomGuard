"""
╔══════════════════════════════════════════════════════════════════════════╗
║          ClassroomGuard — YOLO26 Recommended Settings                   ║
║          Single source of truth for ALL training & inference            ║
╚══════════════════════════════════════════════════════════════════════════╝

Import this anywhere:
    from yolo26_config import YOLO26, COMPARISON

WHY YOLO26 over YOLOv8m / YOLO11?
  - NMS-Free (End-to-End): Removes Non-Maximum Suppression post-processing
    -> saves 5-10ms per frame during live inference
  - MuSGD Optimizer: Momentum-based SGD with adaptive scheduling
    -> converges better on small datasets (like our 178-image set)
  - ProgLoss + STAL: Progressive loss with Spatially-Aware Target Assignment
    -> handles class imbalance (phones << persons in classroom scenes)
  - copy_paste augmentation: Copies phone bboxes onto other images
    -> critical for boosting phone recall without new annotations
  - Same Ultralytics API: Zero code changes needed vs YOLOv8/YOLO11

COMPARISON: YOLOv8m  vs  YOLO26m (what changed and why)

 Setting              | YOLOv8m (OLD)     | YOLO26m (NEW)      | Reason
 ---------------------|-------------------|--------------------|-----------------------------------------
 Base model           | yolov8m.pt        | yolo26m.pt         | Latest architecture, NMS-free
 Optimizer            | "auto" (AdamW)    | "MuSGD"            | Better small-dataset convergence
 Epochs               | 100               | 150                | Small dataset needs more iterations
 LR (initial)         | default (0.01)    | 0.001              | Lower LR = stable fine-tuning
 Warmup               | 3 epochs          | 5 epochs           | Slower warmup prevents early diverge
 Freeze layers        | 0 (none)          | 10 backbone layers | Preserve pretrained features
 mosaic aug           | not set           | 1.0                | Combines 4 images -> more context
 copy_paste           | 0.1               | 0.15               | Copies phones across images
 mixup                | 0.1               | 0.15               | Blends two images
 erasing              | not set           | 0.4                | Simulates phone partially hidden
 close_mosaic         | not set           | 20 epochs          | Stable final convergence
 cache                | not set           | "ram"              | Small dataset -> cache to RAM
 Patience             | 20                | 30                 | More patience for plateaus
 Confidence (detect)  | 0.50              | 0.40               | Phones often half-hidden
 Conf (phone rule)    | 0.50              | 0.35               | Better recall for occluded phones
 Output model name    | yolov8m_custom.pt | yolo26m_custom.pt  | Clear versioning
"""

from pathlib import Path

# Paths relative to ai/ directory
_AI_DIR = Path(__file__).resolve().parent
_DATA_DIR = _AI_DIR.parent / "data"


class YOLO26:
    """All recommended YOLO26 settings for ClassroomGuard."""

    # ── Model weights ─────────────────────────────────────────────────────────
    BASE_MODEL        = "yolo26m.pt"           # Ultralytics auto-downloads this
    FAST_MODEL        = str(_AI_DIR / "yolo26n.pt")  # Already on disk (5.5MB nano)
    CUSTOM_MODEL_OUT  = str(_AI_DIR / "models" / "yolo26m_custom.pt")

    # Model priority list (first that exists wins)
    MODEL_PRIORITY = [
        str(_AI_DIR / "models" / "yolo26m_custom.pt"),  # 1. Our trained model
        str(_AI_DIR / "yolo26m.pt"),                    # 2. Base YOLO26m
        str(_AI_DIR / "yolo26n.pt"),                    # 3. Nano (already on disk)
        str(_AI_DIR / "models" / "yolov8m.pt"),         # 4. Legacy fallback
        "yolo26m.pt",                                   # 5. Auto-download
    ]

    # ── Dataset ───────────────────────────────────────────────────────────────
    DATA_YAML         = str(_AI_DIR / "data" / "merged_classroom" / "merged.yaml")
    NC                = 5       # number of classes
    CLASSES = {
        0: "person",
        1: "cell_phone",
        2: "calculator",
        3: "cheat_sheet",
        4: "earbuds",
    }
    # All known aliases for class names across different datasets
    CLASS_ALIASES = {
        "cell phone":  "cell_phone",   # COCO class 67
        "cell-phone":  "cell_phone",
        "cell-phones": "cell_phone",
        "cellphone":   "cell_phone",
        "mobile":      "cell_phone",
        "smartphone":  "cell_phone",
        "phone":       "cell_phone",
        "calc":        "calculator",
        "earbud":      "earbuds",
        "airpod":      "earbuds",
        "headphone":   "earbuds",
        "cheat sheet": "cheat_sheet",
        "paper":       "cheat_sheet",
        "human":       "person",
        "student":     "person",
    }

    # ── Training hyperparameters ──────────────────────────────────────────────
    EPOCHS            = 150      # More than v8 (100) -> small dataset needs more
    BATCH             = 16       # RTX 4070 8GB fits 16 at 640px
    IMG_SIZE          = 640
    DEVICE            = 0        # GPU index
    HALF              = True     # FP16 - faster on RTX 4070, same accuracy
    WORKERS           = 4
    SEED              = 42
    CACHE             = "ram"    # Small dataset: cache to RAM for speed

    # ── Optimizer (MuSGD -- YOLO26 native) ───────────────────────────────────
    OPTIMIZER         = "MuSGD"  # YOLOv8 used "auto" (AdamW); MuSGD converges better
    LR0               = 0.001    # Initial LR -- lower than default for stable fine-tune
    LRF               = 0.01     # Final LR = LR0 x LRF = 0.00001
    MOMENTUM          = 0.937
    WEIGHT_DECAY      = 0.0005
    WARMUP_EPOCHS     = 5        # v8 default was 3 -- slower warmup prevents early diverge
    WARMUP_MOMENTUM   = 0.8

    # ── Freeze strategy ───────────────────────────────────────────────────────
    FREEZE_LAYERS     = 10       # Freeze first 10 backbone layers
                                 # Preserves pretrained features, trains only head
                                 # v8 training froze 0 layers (full fine-tune)

    # ── Early stopping ────────────────────────────────────────────────────────
    PATIENCE          = 30       # Was 20 in v8 -- more patience for small-dataset plateaus
    SAVE_PERIOD       = 10       # Checkpoint every N epochs

    # ── Augmentation (all tuned for classroom phone detection) ────────────────
    MOSAIC            = 1.0      # Combine 4 images -> richer context for model
    MIXUP             = 0.15     # Blend two images -- improves generalization
    COPY_PASTE        = 0.15     # Copy phone bboxes onto other images
                                 # Critical for boosting phone recall without new labels
    DEGREES           = 10.0     # Rotation +-10 degrees (classrooms are mostly level)
    SCALE             = 0.5      # Scale +-50% -- phones appear at many distances
    SHEAR             = 2.0      # Shear +-2 degrees
    PERSPECTIVE       = 0.0001   # Slight perspective warp
    FLIPLR            = 0.5      # Horizontal flip -- valid in classroom context
    FLIPUD            = 0.0      # No vertical flip (classrooms are upright)
    HSV_H             = 0.015    # Hue jitter
    HSV_S             = 0.7      # Saturation -- handles varied lighting
    HSV_V             = 0.4      # Brightness -- day/night, fluorescent/natural
    ERASING           = 0.4      # Random erase -- simulates phone partially hidden
                                 # under desk/table/hand
    CLOSE_MOSAIC      = 20       # Disable mosaic for last 20 epochs -> stable convergence

    # ── Inference settings ────────────────────────────────────────────────────
    CONF_DETECT       = 0.40     # Was 0.50 -- phones often partially occluded
    CONF_PHONE_RULE   = 0.35     # Was 0.50 -- even lower for alert trigger
    CONF_POSE         = 0.50     # Pose estimation threshold (unchanged)
    IOU_THRESHOLD     = 0.45
    SAMPLE_EVERY      = 3        # Process every Nth frame for speed

    # ── Output paths ──────────────────────────────────────────────────────────
    RUNS_DIR          = str(_AI_DIR / "runs" / "detect")
    RUN_NAME          = "classguard-yolo26m"

    @classmethod
    def get_model(cls) -> str:
        """Return the first available model from priority list."""
        for candidate in cls.MODEL_PRIORITY:
            if Path(candidate).exists():
                return candidate
        return cls.BASE_MODEL  # trigger auto-download

    @classmethod
    def normalize_class(cls, name: str) -> str:
        """Normalize any class name variant to the unified schema.

        Examples:
            'cell phone'  -> 'cell_phone'
            'cell-phones' -> 'cell_phone'
            'Mobile'      -> 'cell_phone'
        """
        key = name.lower().strip()
        if key in cls.CLASS_ALIASES:
            return cls.CLASS_ALIASES[key]
        normalized = key.replace(" ", "_").replace("-", "_")
        if normalized.endswith("s"):
            singular = normalized[:-1]
            if singular in cls.CLASSES.values():
                return singular
        return normalized

    @classmethod
    def as_train_kwargs(cls) -> dict:
        """Return all training params as a dict ready for model.train(**kwargs).

        Usage:
            from yolo26_config import YOLO26
            model.train(data=YOLO26.DATA_YAML, project=YOLO26.RUNS_DIR,
                        name=YOLO26.RUN_NAME, **YOLO26.as_train_kwargs())
        """
        return dict(
            epochs          = cls.EPOCHS,
            batch           = cls.BATCH,
            imgsz           = cls.IMG_SIZE,
            device          = cls.DEVICE,
            half            = cls.HALF,
            workers         = cls.WORKERS,
            seed            = cls.SEED,
            cache           = cls.CACHE,
            # Optimizer
            optimizer       = cls.OPTIMIZER,
            lr0             = cls.LR0,
            lrf             = cls.LRF,
            momentum        = cls.MOMENTUM,
            weight_decay    = cls.WEIGHT_DECAY,
            warmup_epochs   = cls.WARMUP_EPOCHS,
            warmup_momentum = cls.WARMUP_MOMENTUM,
            # Freeze
            freeze          = cls.FREEZE_LAYERS,
            # Early stopping
            patience        = cls.PATIENCE,
            save_period     = cls.SAVE_PERIOD,
            # Augmentation
            augment         = True,
            mosaic          = cls.MOSAIC,
            mixup           = cls.MIXUP,
            copy_paste      = cls.COPY_PASTE,
            degrees         = cls.DEGREES,
            scale           = cls.SCALE,
            shear           = cls.SHEAR,
            perspective     = cls.PERSPECTIVE,
            fliplr          = cls.FLIPLR,
            flipud          = cls.FLIPUD,
            hsv_h           = cls.HSV_H,
            hsv_s           = cls.HSV_S,
            hsv_v           = cls.HSV_V,
            erasing         = cls.ERASING,
            close_mosaic    = cls.CLOSE_MOSAIC,
            # Misc
            pretrained      = True,
            exist_ok        = True,
            verbose         = True,
            plots           = True,
            val             = True,
            deterministic   = True,
        )


# ── Quick-access comparison dict ──────────────────────────────────────────────
COMPARISON = {
    "model":           {"old": "yolov8m.pt",        "new": "yolo26m.pt",        "reason": "NMS-free architecture, 43% faster CPU inference"},
    "optimizer":       {"old": "auto (AdamW)",       "new": "MuSGD",             "reason": "Better convergence on small datasets"},
    "epochs":          {"old": 100,                  "new": 150,                 "reason": "Small dataset (178 imgs) needs more iterations"},
    "freeze_layers":   {"old": 0,                    "new": 10,                  "reason": "Preserve backbone features, train head only"},
    "copy_paste":      {"old": 0.1,                  "new": 0.15,                "reason": "Copies phone bboxes across images -> more training examples"},
    "erasing":         {"old": "not set",             "new": 0.4,                "reason": "Simulates phone partially hidden under desk/hand"},
    "cache":           {"old": "none",               "new": "ram",               "reason": "Small dataset fits in RAM -> faster training epochs"},
    "patience":        {"old": 20,                   "new": 30,                  "reason": "More patience for small-dataset learning plateaus"},
    "warmup_epochs":   {"old": 3,                    "new": 5,                   "reason": "Slower warmup prevents early divergence"},
    "conf_detect":     {"old": 0.50,                 "new": 0.40,                "reason": "Phones often partially occluded in classroom"},
    "conf_phone_rule": {"old": 0.50,                 "new": 0.35,                "reason": "Better recall for partial-view phone detections"},
    "output_model":    {"old": "yolov8m_custom.pt",  "new": "yolo26m_custom.pt", "reason": "Clear versioning"},
}


if __name__ == "__main__":
    print(__doc__)
    print("\n" + "=" * 72)
    print("YOLO26 RECOMMENDED SETTINGS COMPARISON")
    print("=" * 72)
    print(f"\n  {'Setting':<20} {'YOLOv8m (OLD)':<22} {'YOLO26m (NEW)':<22} Reason")
    print("  " + "-" * 100)
    for key, val in COMPARISON.items():
        print(f"  {key:<20} {str(val['old']):<22} {str(val['new']):<22} {val['reason']}")

    print(f"\n\n  Active model  : {YOLO26.get_model()}")
    print(f"  Data YAML     : {YOLO26.DATA_YAML}")
    print(f"  Output model  : {YOLO26.CUSTOM_MODEL_OUT}")
    print(f"  Training args : {len(YOLO26.as_train_kwargs())} parameters configured")
    print("\n  Import in any script:")
    print("    from yolo26_config import YOLO26")
    print("    model.train(data=YOLO26.DATA_YAML, **YOLO26.as_train_kwargs())")
