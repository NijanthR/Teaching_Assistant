from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommunityMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('message', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['created_at', 'id'],
            },
        ),
    ]
