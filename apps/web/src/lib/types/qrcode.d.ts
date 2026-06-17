declare module 'qrcode' {
  interface QRCodeOptions {
    type?: 'svg' | 'png' | 'utf8' | 'terminal';
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  export function toString(text: string, options?: QRCodeOptions): Promise<string>;
  export function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions,
  ): Promise<void>;
}
