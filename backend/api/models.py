from django.db import models


class Conversation(models.Model):
	id = models.CharField(max_length=64, primary_key=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-updated_at']

	def __str__(self):
		return self.id


class ChatMessage(models.Model):
	ROLE_CHOICES = (
		('user', 'User'),
		('assistant', 'Assistant'),
	)

	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
	role = models.CharField(max_length=16, choices=ROLE_CHOICES)
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['created_at', 'id']

	def __str__(self):
		return f'{self.role}: {self.content[:60]}'
