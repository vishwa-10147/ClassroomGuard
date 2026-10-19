"""Seat and ignore zones drawn on a camera view in the web app (Cameras -> Zones).

Zones are rectangles in 0-1 fractions of the image, so they survive a change of stream
resolution. A seat zone labels detections with a seat ("B4"); an ignore zone covers places
where people are expected to handle phones or move about, such as the invigilator's desk.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Zone:
    id: str
    type: str  # "seat" | "ignore"
    label: str
    x: float
    y: float
    w: float
    h: float

    def contains(self, px: float, py: float, width: int, height: int) -> bool:
        return (
            self.x * width <= px <= (self.x + self.w) * width
            and self.y * height <= py <= (self.y + self.h) * height
        )

    @property
    def area(self) -> float:
        return self.w * self.h


def parse_zones(raw: list | None) -> list[Zone]:
    """Zones from the API, skipping malformed entries rather than failing the camera."""
    zones = []
    for z in raw or []:
        try:
            zone = Zone(
                id=str(z["id"]), type=str(z["type"]), label=str(z.get("label") or ""),
                x=float(z["x"]), y=float(z["y"]), w=float(z["w"]), h=float(z["h"]),
            )
        except (KeyError, TypeError, ValueError):
            continue
        if zone.type in ("seat", "ignore") and zone.w > 0 and zone.h > 0:
            zones.append(zone)
    return zones


def _centre(bbox) -> tuple[float, float]:
    return (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2


class ZoneMap:
    def __init__(self, zones: list[Zone] | None = None):
        self.zones = zones or []

    @property
    def seats(self) -> list[Zone]:
        return [z for z in self.zones if z.type == "seat"]

    def is_ignored(self, bbox, width: int, height: int) -> bool:
        """True when the centre of a box lies in an ignore zone."""
        cx, cy = _centre(bbox)
        return any(z.type == "ignore" and z.contains(cx, cy, width, height) for z in self.zones)

    def seat_for(self, person_bbox, object_bbox, width: int, height: int) -> str | None:
        """The seat of a detection: where the object is, else where the student sits.

        When zones overlap the smallest one wins (it is the most specific).
        """
        for bbox in (object_bbox, person_bbox):
            if bbox is None:
                continue
            cx, cy = _centre(bbox)
            hits = [z for z in self.seats if z.contains(cx, cy, width, height)]
            if hits:
                return min(hits, key=lambda z: z.area).label
        return None
