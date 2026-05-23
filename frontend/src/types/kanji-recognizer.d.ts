declare module 'kanji-recognizer' {
  export interface StrokeRecognizerOptions {
    passThreshold?: number;
    startDistThreshold?: number;
    lengthRatioMin?: number;
    lengthRatioMax?: number;
    resamplingPoints?: number;
  }

  export interface StrokeRecognizerResult {
    success: boolean;
    score: number;
    message: string;
  }

  export class StrokeRecognizer {
    constructor(options?: StrokeRecognizerOptions);
    evaluate(userPoints: Array<{ x: number; y: number }>, targetD: string): StrokeRecognizerResult;
  }
}
