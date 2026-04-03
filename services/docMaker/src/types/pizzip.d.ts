declare module 'pizzip' {
  interface PizZipFile {
    name: string;
    data: string | Uint8Array;
    options: PizZipObjectOptions;
    comment: string;
    async(type: string, callback?: (data: unknown) => void): unknown;
    nodeStream(type?: string, callback?: (data: unknown) => void): unknown;
  }

  interface PizZipObjectOptions {
    base64?: boolean;
    binary?: boolean;
    optimizedBinaryString?: boolean;
    createFolders?: boolean;
    date?: Date;
    compression?: string;
    comment?: string;
    unixPermissions?: string | number | null;
    dosPermissions?: number | null;
  }

  interface PizZipGenerateOptions {
    type?: 'base64' | 'string' | 'array' | 'uint8array' | 'arraybuffer' | 'blob' | 'nodebuffer';
    compression?: 'STORE' | 'DEFLATE';
    compressionOptions?: { level?: number };
    comment?: string;
    mimeType?: string;
    encodeFileName?: (name: string) => string;
    streamFiles?: boolean;
    platform?: 'DOS' | 'UNIX';
  }

  class PizZip {
    files: { [key: string]: PizZipFile };
    comment: string;

    constructor(data?: string | ArrayBuffer | Uint8Array | Buffer, options?: object);

    file(name: string): PizZipFile | null;
    file(name: string, data: string | ArrayBuffer | Uint8Array | Buffer, options?: PizZipObjectOptions): this;
    folder(name: string): PizZip | null;
    remove(name: string): this;
    generate(options?: PizZipGenerateOptions): string | Uint8Array | ArrayBuffer | Buffer;
    generateAsync(
      options?: PizZipGenerateOptions,
      onUpdate?: (metadata: { percent: number; currentFile: string | null }) => void,
    ): Promise<string | Uint8Array | ArrayBuffer | Buffer>;
    generateNodeStream(
      options?: PizZipGenerateOptions,
      onUpdate?: (metadata: { percent: number; currentFile: string | null }) => void,
    ): NodeJS.ReadableStream;
    loadAsync(
      data: string | ArrayBuffer | Uint8Array | Buffer,
      options?: object,
    ): Promise<PizZip>;
  }

  export = PizZip;
}

