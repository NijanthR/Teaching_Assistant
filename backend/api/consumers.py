import json
import time
import uuid
from threading import Lock

from channels.generic.websocket import AsyncWebsocketConsumer

MESSAGE_TTL_SECONDS = 60
MAX_MESSAGES = 200

_MESSAGES = []
_MESSAGES_LOCK = Lock()


def _prune_messages(messages, now):
    cutoff = now - MESSAGE_TTL_SECONDS
    return [msg for msg in messages if msg.get('timestamp', 0) >= cutoff]


class CommunityChatConsumer(AsyncWebsocketConsumer):
    group_name = 'community_chat'

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self._send_snapshot()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        payload = self._parse_json(text_data)
        name = str(payload.get('name') or '').strip()
        message = str(payload.get('message') or '').strip()

        if not name or not message:
            return

        name = name[:50]
        message = message[:500]
        now = int(time.time())

        new_message = {
            'id': str(uuid.uuid4()),
            'name': name,
            'message': message,
            'timestamp': now,
        }

        with _MESSAGES_LOCK:
            fresh = _prune_messages(_MESSAGES, now)
            fresh.append(new_message)
            if len(fresh) > MAX_MESSAGES:
                fresh = fresh[-MAX_MESSAGES:]
            _MESSAGES[:] = fresh

        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'broadcast_message',
                'message': new_message,
            },
        )

    async def broadcast_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'message',
                    'message': event.get('message'),
                }
            )
        )

    async def _send_snapshot(self):
        now = int(time.time())
        with _MESSAGES_LOCK:
            fresh = _prune_messages(_MESSAGES, now)
            _MESSAGES[:] = fresh
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'snapshot',
                    'messages': fresh,
                }
            )
        )

    @staticmethod
    def _parse_json(text_data):
        if not text_data:
            return {}
        try:
            return json.loads(text_data)
        except json.JSONDecodeError:
            return {}
