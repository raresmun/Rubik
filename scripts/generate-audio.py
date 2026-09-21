#!/usr/bin/env python3
"""Pre-generate compressed Romanian clips using local Piper and FFmpeg.

Install generation-only dependencies: pip install piper-tts==1.8.0
node scripts/generate-audio.mjs --model /path/to/ro_RO-mihai-medium.onnx
The ONNX model and same-named .onnx.json config must exist locally.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile
import wave

# Generation is deliberately network-disabled on Linux. This is stricter than
# ONNX Runtime's telemetry preference: native libraries cannot open sockets.
import ctypes
import ctypes.util
import errno
import sys


def disable_process_network():
    if sys.platform != 'linux':
        raise RuntimeError('Run generation on Linux with libseccomp for guaranteed offline synthesis.')
    library = ctypes.util.find_library('seccomp')
    if not library:
        raise RuntimeError('libseccomp is required for offline generation.')
    seccomp = ctypes.CDLL(library, use_errno=True)
    seccomp.seccomp_init.argtypes = [ctypes.c_uint32]
    seccomp.seccomp_init.restype = ctypes.c_void_p
    seccomp.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    seccomp.seccomp_syscall_resolve_name.restype = ctypes.c_int
    seccomp.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    seccomp.seccomp_load.argtypes = [ctypes.c_void_p]
    seccomp.seccomp_release.argtypes = [ctypes.c_void_p]
    ctx = seccomp.seccomp_init(0x7fff0000)  # SCMP_ACT_ALLOW
    if not ctx:
        raise RuntimeError('Cannot create offline syscall policy.')
    try:
        for name in ('socket', 'socketpair', 'connect', 'sendto', 'sendmsg', 'sendmmsg'):
            syscall = seccomp.seccomp_syscall_resolve_name(name.encode())
            if syscall >= 0 and seccomp.seccomp_rule_add(ctx, 0x00050000 | errno.EPERM, syscall, 0) != 0:
                raise RuntimeError('Cannot deny networking: ' + name)
        if seccomp.seccomp_load(ctx) != 0:
            raise RuntimeError('Cannot activate offline syscall policy.')
    finally:
        seccomp.seccomp_release(ctx)
    import socket
    try:
        socket.socket()
    except PermissionError:
        return
    raise RuntimeError('Offline policy verification failed.')


disable_process_network()
import onnxruntime

# Offline generation needs no network. Disable telemetry before model creation.
onnxruntime.disable_telemetry_events()
from piper import PiperVoice, SynthesisConfig

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True, type=pathlib.Path)
parser.add_argument('--force', action='store_true')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'public' / 'audio'
scripts = json.loads((out / 'scripts.json').read_text())
voice = PiperVoice.load(args.model)
config = SynthesisConfig(length_scale=1.04, noise_scale=0.5, noise_w_scale=0.65)
manifest = {'version': 1, 'voice': 'Piper ro_RO-mihai-medium', 'language': 'ro-RO', 'files': []}
with tempfile.TemporaryDirectory(prefix='erik-audio-') as temp:
    for index, clip in enumerate(scripts):
        if not all(c.isalnum() or c in '-_' for c in clip['key']):
            raise ValueError(f"Unsafe clip key: {clip['key']}")
        digest = hashlib.sha256(clip['text'].encode()).hexdigest()[:12]
        name = f"{clip['key']}-{digest}.mp3"
        destination = out / name
        if args.force or not destination.exists() or destination.stat().st_size < 1000:
            wav_path = pathlib.Path(temp) / 'clip.wav'
            with wave.open(str(wav_path), 'wb') as wav_file:
                voice.synthesize_wav(clip['text'], wav_file, syn_config=config)
            temporary_mp3 = pathlib.Path(temp) / 'clip.mp3'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav_path), '-codec:a', 'libmp3lame', '-b:a', '56k', '-ac', '1', str(temporary_mp3)], check=True)
            destination.write_bytes(temporary_mp3.read_bytes())
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(destination)]))
        if duration <= 0.2 or destination.stat().st_size < 1000:
            raise ValueError(f'Invalid audio: {destination}')
        manifest['files'].append({**clip, 'src': f'/audio/{name}', 'duration': round(duration, 3), 'bytes': destination.stat().st_size})
        print(f"[{index+1}/{len(scripts)}] {clip['key']}: {duration:.1f}s", flush=True)
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f"Generated {len(scripts)} clips; {sum(c['bytes'] for c in manifest['files']) / 1_000_000:.2f} MB")
