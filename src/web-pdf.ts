import { spawn } from 'node:child_process';
import { accessSync, constants, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { WebError, maxPageBytes } from './web-network.js';
export function findPdfReader() {
  const name = process.platform === 'win32' ? 'pdftotext.exe' : 'pdftotext';
  return (process.env.PATH ?? '').split(delimiter).filter(Boolean).map(dir => join(dir,name))
    .find(path => { try { accessSync(path,constants.X_OK); return true; } catch { return false; } });
}
export async function extractPdf(bytes: Buffer, signal: AbortSignal) {
  const reader = findPdfReader();
  if (!reader) throw new WebError('pdf_reader_missing', 'PDF text extraction needs the locally installed pdftotext command. No reader is downloaded automatically.');
  const directory = mkdtempSync(join(tmpdir(),'repi-pdf-'));
  try {
    const file = join(directory,'source.pdf'); writeFileSync(file,bytes,{mode:0o600});
    const text = await new Promise<string>((resolve,reject) => {
      const process = spawn(reader,['-layout','-enc','UTF-8',file,'-'],{stdio:['ignore','pipe','ignore'],signal,windowsHide:true});
      const chunks: Buffer[] = []; let count = 0, oversized = false;
      process.stdout.on('data',(chunk:Buffer) => {
        count += chunk.length;
        if (count > maxPageBytes) { oversized = true; process.kill(); }
        else chunks.push(chunk);
      });
      process.once('error',reject);
      process.once('close',code => code === 0 && !oversized ? resolve(Buffer.concat(chunks).toString('utf8'))
        : reject(new WebError('pdf_extract','The native PDF reader could not extract this document within the limits. Scanned PDFs need OCR.')));
    });
    return { text:text.slice(0,120000),truncated:text.length > 120000 };
  } finally { await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
}
