export interface OcrProvider {
  extractNumberFromImage(url: string): Promise<number>;
}
