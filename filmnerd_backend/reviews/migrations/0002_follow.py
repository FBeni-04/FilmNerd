from django.db import migrations, models
import django.conf


class Migration(migrations.Migration):

    dependencies = [
        ("reviews", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Follow",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("from_user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="following", to=django.conf.settings.AUTH_USER_MODEL)),
                ("to_user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="followers", to=django.conf.settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="follow",
            constraint=models.UniqueConstraint(fields=("from_user", "to_user"), name="unique_follow"),
        ),
    ]