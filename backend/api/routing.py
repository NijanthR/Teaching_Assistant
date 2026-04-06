from django.urls import path

from .consumers import CommunityChatConsumer

websocket_urlpatterns = [
    path('ws/community/', CommunityChatConsumer.as_asgi()),
]
