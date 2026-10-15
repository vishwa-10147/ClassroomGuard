"""Build the exam-hall object dataset: cell_phone + calculator.

Sources
  * Roboflow classroom CCTV phone sets (data/Classroom-Cell-Phone-Detection.v20i,
    data/classroom phone detection.v2i). Only the phone class is kept - their "person"
    label marks phone users only, so it is not an exhaustive person label. People come
    from the pose model at inference time.
  * Open Images V6 human-verified boxes for Calculator and Mobile phone (CC BY 4.0).
    Filtered box CSVs live in ai/data/openimages/{train,validation,test}-boxes.csv.
  * LVIS v1 calculator images (COCO photos, CC BY 4.0) whose calculators are exhaustively
    labelled - LVIS train -> train, LVIS val -> val. Selected list: ai/data/lvis/calculator_images.json.

Leakage control
  * The two Roboflow sets share ~200 frames: frames are de-duplicated by original name.
  * CCTV frames are split by classroom (not by frame), so the test set is a room the model
    never saw: Class_1 -> test, Class_4 -> val, Class_2 + Class_3 -> train.
  * Open Images keeps its official train/validation/test split.

Output: ai/data/exam_detector/{train,val,test}/{images,labels} + exam_detector.yaml
"""

import argparse
import csv
import json
import random
import re
import shutil
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import requests

AI_DIR = Path(__file__).resolve().parents[1]
REPO = AI_DIR.parent
OUT = AI_DIR / "data" / "exam_detector"
OI_DIR = AI_DIR / "data" / "openimages"
LVIS_LIST = AI_DIR / "data" / "lvis" / "calculator_images.json"

CLASSES = ["cell_phone", "calculator"]
ROBOFLOW_SETS = [
    REPO / "data" / "Classroom-Cell-Phone-Detection.v20i.yolov8",
    REPO / "data" / "classroom phone detection.v2i.yolov8",
]
ROBOFLOW_PHONE_CLASS = "0"  # names: ['cell-phones', 'person']
ROOM_SPLIT = {"Class_1": "test", "Class_4": "val", "Class_2": "train", "Class_3": "train"}

OI_LABELS = {"/m/050k8": 0, "/m/024d2": 1}  # Mobile phone, Calculator
OI_SPLITS = {"train": "train", "validation": "val", "test": "test"}
MAX_OI_PHONE_IMAGES = {"train": 1500, "val": 300, "test": 300}
MAX_SIDE = 1280


def _original_name(path: Path) -> str:
    name = re.sub(r"\.rf\.[0-9a-f]+", "", path.name)
    return re.sub(r"_(jpg|jpeg|png)\.", ".", name)


def _room(name: str) -> str | None:
    m = re.match(r"(Class_\d+)_Video", name)
    return m.group(1) if m else None


def build_roboflow(stats: dict) -> None:
    seen: set[str] = set()
    for root in ROBOFLOW_SETS:
        for img in sorted(root.glob("*/images/*")):
            orig = _original_name(img)
            split = ROOM_SPLIT.get(_room(orig) or "")
            if split is None or orig in seen:
                continue
            seen.add(orig)
            lbl = img.parent.parent / "labels" / (img.stem + ".txt")
            lines = [
                "0 " + line.split(maxsplit=1)[1]
                for line in lbl.read_text().splitlines()
                if line.strip() and line.split()[0] == ROBOFLOW_PHONE_CLASS
            ]
            stem = "cctv_" + Path(orig).stem
            shutil.copy(img, OUT / split / "images" / (stem + img.suffix))
            (OUT / split / "labels" / (stem + ".txt")).write_text("\n".join(lines) + ("\n" if lines else ""))
            stats[split]["cctv_images"] += 1
            stats[split]["cell_phone"] += len(lines)


def _read_oi_boxes(split: str) -> dict[str, list[tuple[int, float, float, float, float]]]:
    """ImageID -> [(cls, xmin, xmax, ymin, ymax)], dropping images with group/depiction boxes."""
    boxes: dict[str, list] = defaultdict(list)
    bad: set[str] = set()
    path = OI_DIR / f"{split}-boxes.csv"
    # Columns: ImageID,Source,LabelName,Confidence,XMin,XMax,YMin,YMax,IsOccluded,IsTruncated,IsGroupOf,IsDepiction,IsInside
    for row in csv.reader(path.open()):
        image_id, label = row[0], row[2]
        if label not in OI_LABELS:
            continue
        if row[10] == "1" or row[11] == "1":
            bad.add(image_id)
            continue
        boxes[image_id].append((OI_LABELS[label], *map(float, row[4:8])))
    return {k: v for k, v in boxes.items() if k not in bad}


def _fetch(oi_split: str, image_id: str, dest: Path) -> bool:
    return _fetch_url(f"https://open-images-dataset.s3.amazonaws.com/{oi_split}/{image_id}.jpg", dest)


def _fetch_url(url: str, dest: Path) -> bool:
    if dest.exists():
        return True
    try:
        r = requests.get(url, timeout=30)
        if r.status_code != 200:
            return False
        tmp = dest.with_suffix(".part")
        tmp.write_bytes(r.content)
        im = cv2.imread(str(tmp))
        if im is None:
            tmp.unlink()
            return False
        h, w = im.shape[:2]
        scale = MAX_SIDE / max(h, w)
        if scale < 1:
            im = cv2.resize(im, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(dest), im, [cv2.IMWRITE_JPEG_QUALITY, 92])
        tmp.unlink()
        return True
    except requests.RequestException:
        return False


def build_openimages(stats: dict, workers: int) -> None:
    rng = random.Random(0)
    cache = OI_DIR / "images"
    cache.mkdir(parents=True, exist_ok=True)
    for oi_split, split in OI_SPLITS.items():
        boxes = _read_oi_boxes(oi_split)
        calc = [i for i, b in boxes.items() if any(c == 1 for c, *_ in b)]
        phone_only = sorted(i for i, b in boxes.items() if all(c == 0 for c, *_ in b))
        rng.shuffle(phone_only)
        chosen = calc + phone_only[: MAX_OI_PHONE_IMAGES[split]]
        with ThreadPoolExecutor(workers) as pool:
            ok = list(pool.map(lambda i: _fetch(oi_split, i, cache / f"{i}.jpg"), chosen))
        for image_id, fetched in zip(chosen, ok):
            if not fetched:
                continue
            stem = "oi_" + image_id
            shutil.copy(cache / f"{image_id}.jpg", OUT / split / "images" / f"{stem}.jpg")
            lines = []
            for cls, x0, x1, y0, y1 in boxes[image_id]:
                lines.append(f"{cls} {(x0 + x1) / 2:.6f} {(y0 + y1) / 2:.6f} {x1 - x0:.6f} {y1 - y0:.6f}")
                stats[split][CLASSES[cls]] += 1
            (OUT / split / "labels" / f"{stem}.txt").write_text("\n".join(lines) + "\n")
            stats[split]["oi_images"] += 1


def build_lvis(stats: dict, workers: int) -> None:
    if not LVIS_LIST.exists():
        return
    items = json.loads(LVIS_LIST.read_text())
    cache = LVIS_LIST.parent / "images"
    cache.mkdir(exist_ok=True)
    with ThreadPoolExecutor(workers) as pool:
        ok = list(pool.map(lambda it: _fetch_url(it["url"], cache / Path(it["url"]).name), items))
    for item, fetched in zip(items, ok):
        if not fetched:
            continue
        name = Path(item["url"]).name
        stem = "lvis_" + Path(name).stem
        # LVIS val images go to val: Open Images alone has only 11 val calculators
        split = item["split"]
        shutil.copy(cache / name, OUT / split / "images" / f"{stem}.jpg")
        w, h = item["w"], item["h"]
        lines = []
        for cls, x, y, bw, bh in item["boxes"]:  # COCO xywh in pixels
            lines.append(f"{cls} {(x + bw / 2) / w:.6f} {(y + bh / 2) / h:.6f} {bw / w:.6f} {bh / h:.6f}")
            stats[split][CLASSES[cls]] += 1
        (OUT / split / "labels" / f"{stem}.txt").write_text("\n".join(lines) + "\n")
        stats[split]["lvis_images"] += 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    if OUT.exists():
        shutil.rmtree(OUT)
    for split in ("train", "val", "test"):
        (OUT / split / "images").mkdir(parents=True)
        (OUT / split / "labels").mkdir(parents=True)

    stats: dict = defaultdict(lambda: defaultdict(int))
    build_roboflow(stats)
    build_openimages(stats, args.workers)
    build_lvis(stats, args.workers)

    (OUT / "exam_detector.yaml").write_text(
        f"path: {OUT.as_posix()}\ntrain: train/images\nval: val/images\ntest: test/images\n"
        f"nc: {len(CLASSES)}\nnames: {CLASSES}\n"
    )
    for split in ("train", "val", "test"):
        print(split, dict(stats[split]))


if __name__ == "__main__":
    main()
