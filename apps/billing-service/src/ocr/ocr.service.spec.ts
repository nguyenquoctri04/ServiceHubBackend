import { OcrService } from './ocr.service';

describe('OcrService', () => {
  const provider = { extractNumberFromImage: jest.fn().mockResolvedValue(42) };
  const service = new OcrService(provider);

  beforeEach(() => jest.clearAllMocks());

  it.each(['http://example.com/meter.jpg', 'https://127.0.0.1/meter.jpg', 'https://localhost/meter.jpg', 'https://user:pass@example.com/meter.jpg'])(
    'rejects unsafe OCR URL %s', async (url) => {
      await expect(service.processImage(url)).rejects.toThrow();
      expect(provider.extractNumberFromImage).not.toHaveBeenCalled();
    },
  );

  it('passes a public HTTPS URL to the OCR provider', async () => {
    await expect(service.processImage('https://cdn.example.com/meter.jpg')).resolves.toBe(42);
    expect(provider.extractNumberFromImage).toHaveBeenCalledWith('https://cdn.example.com/meter.jpg');
  });
});
