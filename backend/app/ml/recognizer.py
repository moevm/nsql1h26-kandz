from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import TYPE_CHECKING

import numpy as np

from app.ml.stroke_preprocessing import Stroke, render_strokes

if TYPE_CHECKING:
    from app.core.config import Settings


@dataclass(frozen=True)
class RecognitionPrediction:
    literal: str
    probability: float


class KanjiCnnRecognizer:
    def __init__(self, model_path: Path, labels_path: Path, image_size: int = 64) -> None:
        from ai_edge_litert.interpreter import Interpreter

        self.image_size = image_size
        self.labels = list(labels_path.read_text(encoding="utf-8").strip())
        self._interpreter = Interpreter(model_path=str(model_path))
        self._interpreter.resize_tensor_input(0, [1, image_size, image_size, 1], strict=False)
        self._interpreter.allocate_tensors()
        self._input = self._interpreter.get_input_details()[0]
        self._output = self._interpreter.get_output_details()[0]
        self._lock = Lock()

    def predict(self, strokes: list[Stroke], top_k: int = 200) -> list[RecognitionPrediction]:
        image = render_strokes(strokes, self.image_size)

        with self._lock:
            self._interpreter.set_tensor(self._input["index"], image)
            self._interpreter.invoke()
            scores = self._interpreter.get_tensor(self._output["index"])[0]

        safe_scores = np.nan_to_num(scores, nan=0.0, posinf=0.0, neginf=0.0)
        count = min(top_k, len(safe_scores), len(self.labels))
        if count <= 0:
            return []

        top_indices = np.argpartition(safe_scores, -count)[-count:]
        top_indices = top_indices[np.argsort(safe_scores[top_indices])[::-1]]

        return [
            RecognitionPrediction(self.labels[int(index)], float(safe_scores[int(index)]))
            for index in top_indices
            if self.labels[int(index)].strip()
        ]


def load_kanji_recognizer(settings: Settings) -> KanjiCnnRecognizer | None:
    if not settings.recognition_enabled:
        return None

    if not settings.recognition_model_path or not settings.recognition_labels_path:
        return None

    if not settings.recognition_model_path.exists() or not settings.recognition_labels_path.exists():
        return None

    return KanjiCnnRecognizer(settings.recognition_model_path, settings.recognition_labels_path)
