'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageDown, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { questionSvg } from '@/lib/engine/question-media';
import type { Investigation } from '@/lib/engine/question';
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function QuestionMedia({
  run,
  index,
}: {
  run: Investigation;
  index: number;
}) {
  const [recording, setRecording] = useState(false),
    [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function clip() {
    if (typeof MediaRecorder === 'undefined') {
      setMessage(
        'This browser cannot record video. Download the image instead.',
      );
      return;
    }
    const mime = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      setMessage(
        'WebM recording is unavailable here. Download the image instead.',
      );
      return;
    }
    setRecording(true);
    setMessage('Rendering a short replay of the actual calculation graphics…');
    const controller = new AbortController();
    active.current = controller;
    let stream: MediaStream | undefined;
    const urls: string[] = [];
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 900;
      const context = canvas.getContext('2d');
      if (!context || !canvas.captureStream)
        throw new Error('Canvas video is unavailable in this browser.');
      const images = await Promise.all(
        run.passes.map(
          (_, i) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const im = new Image();
              const url = URL.createObjectURL(
                new Blob([questionSvg(run, i)], { type: 'image/svg+xml' }),
              );
              urls.push(url);
              im.onload = () => resolve(im);
              im.onerror = () =>
                reject(new Error('A result graphic could not be rendered.'));
              im.src = url;
            }),
        ),
      );
      if (controller.signal.aborted) return;
      context.drawImage(images[0], 0, 0);
      stream = canvas.captureStream(20);
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      await new Promise<void>((resolve, reject) => {
        let raf = 0;
        const start = performance.now();
        const duration = images.length * 1600;
        const clear = () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
          document.removeEventListener('visibilitychange', visibility);
          controller.signal.removeEventListener('abort', stop);
        };
        const stop = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        const visibility = () => {
          if (document.hidden) {
            setMessage(
              'Clip cancelled when the page was hidden. Keep the page visible to record.',
            );
            controller.abort();
            stop();
          }
        };
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onerror = () => {
          clear();
          reject(new Error('Video recording failed.'));
        };
        recorder.onstop = () => {
          clear();
          resolve();
        };
        function frame(now: number) {
          if (controller.signal.aborted) return;
          const t = now - start;
          context!.drawImage(
            images[Math.min(images.length - 1, Math.floor(t / 1600))],
            0,
            0,
          );
          context!.fillStyle = '#79e6d5';
          context!.fillRect(0, 894, 1200 * Math.min(1, t / duration), 6);
          raf = requestAnimationFrame(frame);
        }
        controller.signal.addEventListener('abort', stop, { once: true });
        document.addEventListener('visibilitychange', visibility);
        recorder.start();
        const timer = setTimeout(stop, duration);
        raf = requestAnimationFrame(frame);
      });
      if (!controller.signal.aborted) {
        save(
          new Blob(chunks, { type: mime }),
          'observatory-investigation.webm',
        );
        setMessage(
          'Video exported. The clip replays recorded calculations; it adds no new evidence.',
        );
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setMessage(e instanceof Error ? e.message : 'Video export failed.');
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      urls.forEach((u) => URL.revokeObjectURL(u));
      if (active.current === controller) {
        active.current = null;
        setRecording(false);
      }
    }
  }
  return (
    <div className="qd-media">
      <div>
        <Button
          variant="outline"
          onClick={() => {
            save(
              new Blob([questionSvg(run, index)], { type: 'image/svg+xml' }),
              'observatory-result.svg',
            );
            setMessage('Image exported from this calculation.');
          }}
        >
          <ImageDown /> Download image
        </Button>
        <Button variant="outline" disabled={recording} onClick={clip}>
          <Film />
          {recording ? 'Rendering clip…' : 'Make a short clip'}
        </Button>
      </div>
      <p role="status">
        {message ||
          'Graphics and clips are generated from the recorded results, without an image-generation API.'}
      </p>
    </div>
  );
}
