import base64
import copy
import json
import os
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from collections import OrderedDict
from threading import Lock

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST
from litellm import RateLimitError, completion

MODEL_REGISTRY = {
	'gemini-2.5-pro': {'provider': 'google', 'model': 'gemini/gemini-2.5-pro'},
	'gemini-2.5-flash': {'provider': 'google', 'model': 'gemini/gemini-2.5-flash'},
	'gemini-2.0-flash': {'provider': 'google', 'model': 'gemini/gemini-2.0-flash'},
	'gpt-5': {'provider': 'openai', 'model': 'gpt-5'},
	'gpt-4o': {'provider': 'openai', 'model': 'gpt-4o'},
	'claude-4': {'provider': 'anthropic', 'model': 'claude-4'},
	'claude-3.5': {'provider': 'anthropic', 'model': 'claude-3.5'},
	'deepseek-chat': {'provider': 'deepseek', 'model': 'deepseek-chat'},
	'hf-llama3-8b': {
		'provider': 'huggingface',
		'model': 'huggingface/meta-llama/Meta-Llama-3-8B-Instruct',
	},
}

PROVIDER_KEYS = {
	'openai': os.getenv('OPENAI_API_KEY'),
	'anthropic': os.getenv('ANTHROPIC_API_KEY'),
	'google': os.getenv('GOOGLE_GENERATIVE_AI_API_KEY') or os.getenv('GOOGLE_API_KEY'),
	'huggingface': os.getenv('HUGGINGFACE_API_KEY'),
	'deepseek': os.getenv('DEEPSEEK_API_KEY'),
}

VISION_PROVIDERS = {'openai', 'google', 'anthropic'}
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'distil-whisper/distil-small.en')
MAX_HISTORY_MESSAGES = int(os.getenv('MAX_CHAT_HISTORY_MESSAGES', '12'))
MAX_STORED_MESSAGES_PER_CONVERSATION = int(os.getenv('MAX_STORED_MESSAGES_PER_CONVERSATION', '200'))
MAX_IN_MEMORY_CONVERSATIONS = int(os.getenv('MAX_IN_MEMORY_CONVERSATIONS', '500'))

# Temporary chat store kept in process memory only; it is cleared on server restart.
_CONVERSATION_STORE = OrderedDict()
_CONVERSATION_LOCK = Lock()


def _get_model_config(model_id):
	config = MODEL_REGISTRY.get(model_id)
	if not config:
		return None
	return {
		**config,
		'api_key': PROVIDER_KEYS.get(config['provider']),
	}


def _build_content(message, images):
	content = []
	if message:
		content.append({'type': 'text', 'text': message})
	for img in images:
		url = (img or {}).get('dataUrl') or (img or {}).get('url')
		if url:
			content.append({'type': 'image_url', 'image_url': {'url': url}})
	return content


def _decode_data_url(data_url):
	if not data_url or not data_url.startswith('data:') or ',' not in data_url:
		return None, None
	header, b64 = data_url.split(',', 1)
	if ';base64' not in header:
		return None, None
	mime = header[5:].split(';', 1)[0] or 'application/octet-stream'
	try:
		return base64.b64decode(b64), mime
	except (ValueError, TypeError):
		return None, None


def _transcribe_audio(audio, api_key):
	data_url = (audio or {}).get('dataUrl')
	if not data_url:
		return None
	data, mime = _decode_data_url(data_url)
	if not data:
		raise ValueError('Invalid audio payload.')
	url = f'https://api-inference.huggingface.co/models/{WHISPER_MODEL}?wait_for_model=true'
	headers = {
		'Authorization': f'Bearer {api_key}',
		'Content-Type': mime or 'application/octet-stream',
	}
	request = urllib.request.Request(url, data=data, headers=headers, method='POST')
	try:
		with urllib.request.urlopen(request, timeout=60) as resp:
			body = resp.read()
			try:
				payload = json.loads(body.decode('utf-8'))
			except json.JSONDecodeError:
				raise ValueError('Audio transcription failed. Check the Hugging Face API key and model access.')
	except urllib.error.HTTPError as exc:
		body = exc.read()
		try:
			payload = json.loads(body.decode('utf-8'))
		except json.JSONDecodeError:
			raise ValueError('Audio transcription failed. Check the Hugging Face API key and model access.')
		if isinstance(payload, dict) and payload.get('error'):
			raise ValueError(payload.get('error'))
		raise ValueError('Audio transcription failed.')
	except urllib.error.URLError as exc:
		raise ValueError(str(exc))
	if isinstance(payload, dict) and payload.get('error'):
		raise ValueError(payload.get('error'))
	if isinstance(payload, dict):
		return payload.get('text')
	return None


def _transcribe_audio_local(audio):
	data_url = (audio or {}).get('dataUrl')
	if not data_url:
		return None
	data, mime = _decode_data_url(data_url)
	if not data:
		raise ValueError('Invalid audio payload.')
	try:
		from faster_whisper import WhisperModel
	except Exception as exc:
		raise ValueError('Local transcription not available. Install faster-whisper and ffmpeg.') from exc
	model_name = os.getenv('LOCAL_WHISPER_MODEL', 'base')
	# Use a temp file since faster-whisper expects a file path.
	suffix = '.webm' if (mime or '').endswith('webm') else '.wav'
	with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
		tmp.write(data)
		tmp.flush()
		model = WhisperModel(model_name, device='cpu', compute_type='int8')
		segments, _info = model.transcribe(tmp.name)
		text = ''.join(segment.text for segment in segments).strip()
		return text or None


def _ensure_in_memory_conversation(conversation_id):
	conversation_key = str(conversation_id or '').strip() or str(uuid.uuid4())
	now = time.time()
	with _CONVERSATION_LOCK:
		entry = _CONVERSATION_STORE.get(conversation_key)
		if not entry:
			entry = {'messages': [], 'updated_at': now}
			_CONVERSATION_STORE[conversation_key] = entry
		else:
			entry['updated_at'] = now
			_CONVERSATION_STORE.move_to_end(conversation_key)

		while len(_CONVERSATION_STORE) > MAX_IN_MEMORY_CONVERSATIONS:
			_CONVERSATION_STORE.popitem(last=False)

	return conversation_key


def _append_in_memory_message(conversation_id, role, content):
	text = str(content or '').strip()
	if not text:
		return

	now = time.time()
	item = {
		'id': str(uuid.uuid4()),
		'role': role,
		'text': text,
		'created_at': now,
	}

	with _CONVERSATION_LOCK:
		entry = _CONVERSATION_STORE.get(conversation_id)
		if not entry:
			entry = {'messages': [], 'updated_at': now}
			_CONVERSATION_STORE[conversation_id] = entry

		entry['messages'].append(item)
		entry['updated_at'] = now
		if len(entry['messages']) > MAX_STORED_MESSAGES_PER_CONVERSATION:
			entry['messages'] = entry['messages'][-MAX_STORED_MESSAGES_PER_CONVERSATION:]
		_CONVERSATION_STORE.move_to_end(conversation_id)

		while len(_CONVERSATION_STORE) > MAX_IN_MEMORY_CONVERSATIONS:
			_CONVERSATION_STORE.popitem(last=False)


def _get_in_memory_history(conversation_id):
	conversation_key = str(conversation_id or '').strip()
	if not conversation_key:
		return []

	with _CONVERSATION_LOCK:
		entry = _CONVERSATION_STORE.get(conversation_key)
		if not entry:
			return []
		entry['updated_at'] = time.time()
		_CONVERSATION_STORE.move_to_end(conversation_key)
		return copy.deepcopy(entry['messages'])


def _serialize_history(conversation_id):
	items = []
	for message in _get_in_memory_history(conversation_id):
		items.append(
			{
				'id': str(message.get('id') or ''),
				'role': str(message.get('role') or ''),
				'text': str(message.get('text') or ''),
				'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(message.get('created_at') or time.time())),
			}
		)
	return items


@csrf_exempt
@require_POST
def chat(request):
	try:
		try:
			payload = json.loads(request.body or '{}')
		except json.JSONDecodeError:
			return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

		message = (payload.get('message') or '').strip()
		model_id = (payload.get('model') or '').strip()
		language = (payload.get('language') or '').strip()
		conversation_id = (payload.get('conversation_id') or '').strip()
		save_history = payload.get('save_history', True)
		images = payload.get('images') or []
		audio = payload.get('audio') or None
		if not isinstance(images, list):
			images = []
		if len(language) > 40:
			return JsonResponse({'error': 'Language value is too long.'}, status=400)
		if not isinstance(save_history, bool):
			save_history = True

		if not message and not images and not audio:
			return JsonResponse({'error': 'Message, image, or audio is required.'}, status=400)
		if not model_id:
			return JsonResponse({'error': 'Model is required.'}, status=400)

		config = _get_model_config(model_id)
		if not config:
			return JsonResponse({'error': 'Unknown model.'}, status=400)
		if not config['api_key']:
			return JsonResponse({'error': 'Missing API key for selected provider.'}, status=500)
		if images and config['provider'] not in VISION_PROVIDERS:
			return JsonResponse({'error': 'Selected model does not support images.'}, status=400)

		if audio:
			hf_key = PROVIDER_KEYS.get('huggingface')
			transcript = None
			remote_error = None
			if hf_key:
				try:
					transcript = _transcribe_audio(audio, hf_key)
				except ValueError as exc:
					remote_error = str(exc)
			if not transcript:
				try:
					transcript = _transcribe_audio_local(audio)
				except ValueError as exc:
					local_error = str(exc)
					if remote_error:
						return JsonResponse({'error': f'{remote_error} {local_error}'}, status=400)
					return JsonResponse({'error': local_error}, status=400)
			if transcript:
				# If audio is present, use Whisper transcript as the sole text input.
				message = transcript.strip()

		if not message and not images:
			return JsonResponse({'error': 'No text extracted from audio.'}, status=400)

		conversation_key = _ensure_in_memory_conversation(conversation_id)

		content = _build_content(message, images) if images else message
		messages = []
		system_prompt = (
			'You are an expert teacher. Explain concepts briefly and in an easy-to-understand way. '
			'Use clear language and include simple examples when helpful.'
		)
		if language:
			system_prompt = f'{system_prompt} Respond in {language}.'
		messages.append({'role': 'system', 'content': system_prompt})

		history = _get_in_memory_history(conversation_key)[-MAX_HISTORY_MESSAGES:]
		for past in history:
			past_text = str(past.get('text') or '').strip()
			past_role = str(past.get('role') or '').strip()
			if past_text and past_role in {'user', 'assistant'}:
				messages.append({'role': past_role, 'content': past_text})

		messages.append({'role': 'user', 'content': content})

		request_kwargs = {
			'model': config['model'],
			'messages': messages,
			'api_key': config['api_key'],
		}

		if config['provider'] == 'google':
			request_kwargs['google_api_key'] = config['api_key']

		if config['provider'] == 'deepseek':
			request_kwargs['api_base'] = 'https://api.deepseek.com'

		try:
			response = completion(**request_kwargs)
			reply_content = response['choices'][0]['message']['content']
			if isinstance(reply_content, list):
				reply = ''.join(
					part.get('text', '') if isinstance(part, dict) else str(part)
					for part in reply_content
				).strip()
			else:
				reply = str(reply_content or '').strip()
		except RateLimitError as exc:
			return JsonResponse(
				{
					'error': 'Rate limit exceeded for the selected model.',
					'details': str(exc),
				},
				status=429,
			)
		except Exception as exc:
			return JsonResponse({'error': str(exc)}, status=500)

		if save_history:
			stored_user_text = message or (f'[Sent {len(images)} image(s)]' if images else '')
			if stored_user_text:
				_append_in_memory_message(conversation_key, 'user', stored_user_text)
			_append_in_memory_message(conversation_key, 'assistant', reply)

		return JsonResponse({'reply': reply, 'conversation_id': conversation_key})
	except Exception as exc:
		# Keep unexpected server failures JSON-formatted so the frontend can show a useful message.
		return JsonResponse({'error': 'Unexpected server error.', 'details': str(exc)}, status=500)


@csrf_exempt
@require_GET
def chat_history(request):
	conversation_id = (request.GET.get('conversation_id') or '').strip()
	if not conversation_id:
		return JsonResponse({'error': 'conversation_id is required.'}, status=400)
	return JsonResponse({'conversation_id': conversation_id, 'messages': _serialize_history(conversation_id)})
