"""Live audio for Eufy cameras: listen to a camera and talk through it.

The Eufy Security integration receives the camera's livestream audio but does not
pass it on, and it has no talkback. This module fills both gaps for the panel:

* listen: the AAC audio frames of a running P2P livestream are decoded with ffmpeg
  to 16 kHz mono PCM and sent to the browser over the Home Assistant websocket.
* talk: 16 kHz mono PCM from the browser microphone is encoded with ffmpeg to AAC
  (ADTS) and sent frame by frame to the eufy-security-ws add-on as talkback audio.

Both only work while a P2P livestream of that camera is running.
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import logging
import re
import uuid
from typing import Any, Callable

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

_LOGGER = logging.getLogger(__name__)

EUFY = "eufy_security"
SERIAL_RE = re.compile(r"^eufy_security_([A-Za-z0-9]+)_")
RATE = 16000
CHUNK = 3200  # 100 ms of 16 bit mono PCM at 16 kHz
AUDIO_HANDLER = "_handle_livestream_audio_data_received"
DATA_TAPS = "rams_home_audio_taps"
DATA_TALKS = "rams_home_talks"


class CameraAudioError(Exception):
    """Raised when camera audio cannot be started."""


def _serial(hass: HomeAssistant, entity_id: str) -> str:
    ent = er.async_get(hass).async_get(entity_id)
    if ent is None or ent.platform != EUFY:
        raise CameraAudioError(f"{entity_id} is not a Eufy camera")
    match = SERIAL_RE.match(ent.unique_id or "")
    if not match:
        raise CameraAudioError(f"No serial number found for {entity_id}")
    return match.group(1)


def _coordinator(hass: HomeAssistant) -> Any:
    coord = hass.data.get(EUFY, {}).get("coordinator")
    if coord is None:
        raise CameraAudioError("The Eufy Security integration is not loaded")
    return coord


def _ffmpeg(hass: HomeAssistant) -> str:
    with contextlib.suppress(Exception):
        from homeassistant.components.ffmpeg import get_ffmpeg_manager

        return get_ffmpeg_manager(hass).binary
    return "ffmpeg"


async def _send(hass: HomeAssistant, message: dict, wait: bool = False) -> None:
    """Send a raw command to eufy-security-ws through the Eufy integration.

    With wait=True the add-on's answer is awaited, so an error (such as no running
    livestream) reaches the panel instead of failing silently.
    """
    coord = _coordinator(hass)
    message = {"messageId": f"rams_home.{uuid.uuid4().hex}", **message}
    future = None
    api = getattr(coord, "_api", None)
    futures = getattr(api, "_result_futures", None)
    if wait and isinstance(futures, dict):
        future = hass.loop.create_future()
        futures[message["messageId"]] = future
    try:
        await coord.send_message(message)
        if future is not None:
            await asyncio.wait_for(future, 10)
    except asyncio.TimeoutError as err:
        raise CameraAudioError("The camera did not answer in time") from err
    except Exception as err:  # noqa: BLE001
        code = getattr(err, "error_code", None)
        raise CameraAudioError(str(code or err)) from err
    finally:
        if future is not None:
            futures.pop(message["messageId"], None)


async def _kill(proc: asyncio.subprocess.Process | None) -> None:
    if proc is None or proc.returncode is not None:
        return
    with contextlib.suppress(Exception):
        if proc.stdin:
            proc.stdin.close()
    with contextlib.suppress(Exception):
        proc.kill()
    with contextlib.suppress(Exception):
        await asyncio.wait_for(proc.wait(), 3)


class AudioTap:
    """Decodes the livestream audio of one camera for any number of listeners."""

    def __init__(self, hass: HomeAssistant, serial: str) -> None:
        self.hass = hass
        self.serial = serial
        self.listeners: set[Callable[[bytes], None]] = set()
        self._proc: asyncio.subprocess.Process | None = None
        self._reader: asyncio.Task | None = None
        self._product: Any = None

    async def start(self) -> None:
        product = _coordinator(self.hass).devices.get(self.serial)
        if product is None:
            raise CameraAudioError("Camera not found in the Eufy integration")
        self._proc = await asyncio.create_subprocess_exec(
            _ffmpeg(self.hass),
            "-hide_banner", "-loglevel", "error",
            "-fflags", "nobuffer", "-probesize", "32", "-analyzeduration", "0",
            "-f", "aac", "-i", "pipe:0",
            "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-flush_packets", "1", "pipe:1",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        proc = self._proc

        async def on_audio(event: Any) -> None:
            data = (event.data.get("buffer") or {}).get("data")
            if data and proc.stdin and not proc.stdin.is_closing():
                with contextlib.suppress(Exception):
                    proc.stdin.write(bytes(data))

        # The Eufy integration looks this handler up by name for every event, and its
        # own version drops the audio. An instance attribute takes precedence.
        setattr(product, AUDIO_HANDLER, on_audio)
        self._product = product
        self._reader = self.hass.async_create_background_task(
            self._read(), f"rams_home audio {self.serial}"
        )

    async def _read(self) -> None:
        assert self._proc and self._proc.stdout
        buf = b""
        while True:
            data = await self._proc.stdout.read(CHUNK)
            if not data:
                break
            buf += data
            if len(buf) < CHUNK // 2:
                continue
            for listener in list(self.listeners):
                listener(buf)
            buf = b""

    async def stop(self) -> None:
        if self._product is not None:
            self._product.__dict__.pop(AUDIO_HANDLER, None)
            self._product = None
        if self._reader:
            self._reader.cancel()
        await _kill(self._proc)
        self._proc = None


class Talkback:
    """Streams microphone audio to one camera."""

    def __init__(self, hass: HomeAssistant, serial: str) -> None:
        self.hass = hass
        self.serial = serial
        self._proc: asyncio.subprocess.Process | None = None
        self._reader: asyncio.Task | None = None

    async def start(self) -> None:
        await _send(self.hass, {"command": "device.start_talkback", "serialNumber": self.serial}, wait=True)
        self._proc = await asyncio.create_subprocess_exec(
            _ffmpeg(self.hass),
            "-hide_banner", "-loglevel", "error",
            "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0",
            "-c:a", "aac", "-b:a", "24k", "-ar", str(RATE), "-ac", "1",
            "-f", "adts", "-flush_packets", "1", "pipe:1",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        self._reader = self.hass.async_create_background_task(
            self._read(), f"rams_home talkback {self.serial}"
        )

    def feed(self, pcm: bytes) -> None:
        proc = self._proc
        if proc and proc.stdin and not proc.stdin.is_closing():
            with contextlib.suppress(Exception):
                proc.stdin.write(pcm)

    async def _read(self) -> None:
        """Split the ffmpeg output into ADTS frames; each frame is one talkback packet."""
        assert self._proc and self._proc.stdout
        out = self._proc.stdout
        while True:
            try:
                head = await out.readexactly(7)
            except asyncio.IncompleteReadError:
                break
            if head[0] != 0xFF or (head[1] & 0xF0) != 0xF0:
                continue  # out of sync; ffmpeg should not do this
            length = ((head[3] & 0x03) << 11) | (head[4] << 3) | ((head[5] & 0xE0) >> 5)
            try:
                body = await out.readexactly(length - 7)
            except asyncio.IncompleteReadError:
                break
            frame = head + body
            try:
                await _send(
                    self.hass,
                    {
                        "command": "device.talkback_audio_data",
                        "serialNumber": self.serial,
                        "buffer": {"type": "Buffer", "data": list(frame)},
                    },
                )
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Talkback frame for %s not sent", self.serial, exc_info=True)

    async def stop(self) -> None:
        if self._reader:
            self._reader.cancel()
        await _kill(self._proc)
        self._proc = None
        with contextlib.suppress(Exception):
            await _send(self.hass, {"command": "device.stop_talkback", "serialNumber": self.serial})


@websocket_api.websocket_command(
    {vol.Required("type"): "rams_home/camera/listen", vol.Required("entity_id"): str}
)
@websocket_api.async_response
async def ws_listen(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Subscribe to the live audio of a camera as base64 PCM chunks."""
    try:
        serial = _serial(hass, msg["entity_id"])
        taps: dict[str, AudioTap] = hass.data.setdefault(DATA_TAPS, {})
        tap = taps.get(serial)
        if tap is None:
            tap = AudioTap(hass, serial)
            await tap.start()
            taps[serial] = tap
    except CameraAudioError as err:
        connection.send_error(msg["id"], "camera_audio", str(err))
        return

    msg_id = msg["id"]

    @callback
    def forward(pcm: bytes) -> None:
        connection.send_message(
            websocket_api.event_message(msg_id, {"pcm": base64.b64encode(pcm).decode(), "rate": RATE})
        )

    tap.listeners.add(forward)

    @callback
    def unsubscribe() -> None:
        tap.listeners.discard(forward)
        if not tap.listeners and taps.get(serial) is tap:
            taps.pop(serial, None)
            hass.async_create_task(tap.stop())

    connection.subscriptions[msg_id] = unsubscribe
    connection.send_result(msg_id)


@websocket_api.websocket_command(
    {vol.Required("type"): "rams_home/camera/talk", vol.Required("entity_id"): str}
)
@websocket_api.async_response
async def ws_talk(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Open a talkback session; it lasts until the subscription ends."""
    talks: dict[str, Talkback] = hass.data.setdefault(DATA_TALKS, {})
    try:
        serial = _serial(hass, msg["entity_id"])
        if serial in talks:
            await talks.pop(serial).stop()
        talk = Talkback(hass, serial)
        await talk.start()
    except CameraAudioError as err:
        connection.send_error(msg["id"], "camera_talk", str(err))
        return
    talks[serial] = talk

    @callback
    def unsubscribe() -> None:
        if talks.get(serial) is talk:
            talks.pop(serial, None)
        hass.async_create_task(talk.stop())

    connection.subscriptions[msg["id"]] = unsubscribe
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "rams_home/camera/talk_audio",
        vol.Required("entity_id"): str,
        vol.Required("pcm"): str,
    }
)
@callback
def ws_talk_audio(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Receive a chunk of 16 kHz mono PCM from the browser microphone."""
    try:
        serial = _serial(hass, msg["entity_id"])
    except CameraAudioError as err:
        connection.send_error(msg["id"], "camera_talk", str(err))
        return
    talk = hass.data.get(DATA_TALKS, {}).get(serial)
    if talk is None:
        connection.send_error(msg["id"], "camera_talk", "No talkback session")
        return
    talk.feed(base64.b64decode(msg["pcm"]))
    connection.send_result(msg["id"])


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the websocket commands once."""
    websocket_api.async_register_command(hass, ws_listen)
    websocket_api.async_register_command(hass, ws_talk)
    websocket_api.async_register_command(hass, ws_talk_audio)
