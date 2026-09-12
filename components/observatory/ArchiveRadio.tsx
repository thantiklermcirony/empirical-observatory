'use client';
/* oxlint-disable jsx-a11y/media-has-caption -- Optional archive audio has source context and native controls; a transcript is not supplied by this archive. */
import { useRef, useState } from 'react';
import { Radio, X } from 'lucide-react';
const recording =
  'https://upload.wikimedia.org/wikipedia/commons/0/03/STS-1_Launch_6qMPLydUbuM.webm';
export default function ArchiveRadio() {
  const [open, setOpen] = useState(false),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  return (
    <aside
      className={`archive-radio ${open ? 'radio-open' : ''}`}
      aria-label="Optional archive radio"
    >
      <button
        className="radio-toggle"
        onClick={() => {
          if (open) {
            audio.current?.pause();
            setPlaying(false);
          }
          setOpen(!open);
        }}
        aria-expanded={open}
      >
        <Radio size={18} />
        {playing ? 'Archive radio playing' : 'Archive radio'}
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="radio-body">
          <div className="radio-frequency" aria-hidden="true">
            <span>FM</span>
            <b>
              19<span>81</span>
            </b>
            <i />
          </div>
          <h2>Columbia takes flight</h2>
          <p>
            12 April 1981 · STS-1 launch audio
            <br />
            NASA Kennedy archive recording
          </p>
          <audio
            ref={audio}
            controls
            preload="none"
            src={recording}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => setError(true)}
            aria-label="Play the NASA STS-1 launch archive audio"
          />
          <p className="radio-context">
            Historical audio from a launch video, not a live broadcast. Press
            play to load it from Wikimedia. No automatic playback.
          </p>
          {error && (
            <p role="alert">
              The archive could not play here. Use the original recording below.
            </p>
          )}
          <a
            href="https://commons.wikimedia.org/wiki/File:STS-1_Launch_6qMPLydUbuM.webm"
            target="_blank"
            rel="noreferrer"
          >
            Watch the original video / source
          </a>
          <button
            className="radio-off"
            onClick={() => {
              audio.current?.pause();
              setPlaying(false);
              setOpen(false);
            }}
          >
            <X size={14} /> Switch off
          </button>
        </div>
      )}
    </aside>
  );
}
