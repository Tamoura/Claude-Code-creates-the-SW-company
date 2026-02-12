// Type declarations for optional dependencies that may not be installed
// These packages are loaded via dynamic import() with try/catch fallback

declare module '@fastify/multipart' {
  import { FastifyPluginCallback } from 'fastify';
  interface MultipartFile {
    toBuffer(): Promise<Buffer>;
    file: NodeJS.ReadableStream;
    fieldname: string;
    filename: string;
    encoding: string;
    mimetype: string;
  }
  interface MultipartOptions {
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      headerPairs?: number;
    };
  }
  const multipart: FastifyPluginCallback<MultipartOptions>;
  export default multipart;
}

declare module '@fastify/static' {
  import { FastifyPluginCallback } from 'fastify';
  interface StaticOptions {
    root: string;
    prefix?: string;
    decorateReply?: boolean;
    serve?: boolean;
  }
  const fastifyStatic: FastifyPluginCallback<StaticOptions>;
  export default fastifyStatic;
}
