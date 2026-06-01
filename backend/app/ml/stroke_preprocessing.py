from __future__ import annotations

from math import ceil, floor, hypot
from typing import Any

import numpy as np


Point = dict[str, float]
Stroke = list[Point]


def _valid_point(value: Any) -> Point | None:
    if not isinstance(value, dict):
        return None

    try:
        x = float(value["x"])
        y = float(value["y"])
    except (KeyError, TypeError, ValueError):
        return None

    if not np.isfinite(x) or not np.isfinite(y):
        return None

    return {"x": x, "y": y}


def clean_strokes(strokes: Any) -> list[Stroke]:
    if not isinstance(strokes, list):
        return []

    clean: list[Stroke] = []
    for stroke in strokes:
        if not isinstance(stroke, list):
            continue

        points = [point for value in stroke if (point := _valid_point(value))]
        if points:
            clean.append(points)

    return clean


def normalize_strokes(strokes: list[Stroke], size: int = 64, padding: int = 6) -> list[Stroke]:
    points = [point for stroke in strokes for point in stroke]
    if not points:
        return []

    min_x = min(point["x"] for point in points)
    max_x = max(point["x"] for point in points)
    min_y = min(point["y"] for point in points)
    max_y = max(point["y"] for point in points)
    width = max(1.0, max_x - min_x)
    height = max(1.0, max_y - min_y)
    usable = max(1.0, size - padding * 2)
    scale = usable / max(width, height)
    scaled_width = width * scale
    scaled_height = height * scale
    offset_x = padding + (usable - scaled_width) / 2
    offset_y = padding + (usable - scaled_height) / 2

    return [
        [
            {
                "x": (point["x"] - min_x) * scale + offset_x,
                "y": (point["y"] - min_y) * scale + offset_y,
            }
            for point in stroke
        ]
        for stroke in strokes
    ]


def _draw_disc(image: np.ndarray, x: float, y: float, radius: float, value: float) -> None:
    left = max(0, floor(x - radius))
    right = min(image.shape[1] - 1, ceil(x + radius))
    top = max(0, floor(y - radius))
    bottom = min(image.shape[0] - 1, ceil(y + radius))

    for row in range(top, bottom + 1):
        for col in range(left, right + 1):
            distance = hypot(col - x, row - y)
            if distance <= radius + 0.5:
                image[row, col] = max(image[row, col], value)


def _draw_segment(image: np.ndarray, start: Point, end: Point, radius: float, value: float) -> None:
    dx = end["x"] - start["x"]
    dy = end["y"] - start["y"]
    steps = max(1, ceil(hypot(dx, dy) * 1.5))

    for step in range(steps + 1):
        ratio = step / steps
        _draw_disc(
            image,
            start["x"] + dx * ratio,
            start["y"] + dy * ratio,
            radius,
            value,
        )


def render_strokes(strokes: list[Stroke], size: int = 64) -> np.ndarray:
    normalized = normalize_strokes(strokes, size=size)
    # A tiny non-zero background avoids NaNs in the DaKanji TFLite model on
    # completely black inputs while remaining visually equivalent to black.
    image = np.full((size, size), 0.01, dtype=np.float32)
    radius = max(2.2, size * 0.045)

    for stroke in normalized:
        if len(stroke) == 1:
            _draw_disc(image, stroke[0]["x"], stroke[0]["y"], radius, 255.0)
            continue

        for index in range(1, len(stroke)):
            _draw_segment(image, stroke[index - 1], stroke[index], radius, 255.0)

    return image.reshape(1, size, size, 1).astype(np.float32)
