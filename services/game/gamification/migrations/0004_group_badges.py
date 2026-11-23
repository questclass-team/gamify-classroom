# ruff: noqa: RUF012

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    # Existing SCRUM-33 installations finish the original migration chain.
    # Upgrading from main never changes the existing Core ID columns.
    replaces = [
        ("gamification", "0004_badge_alter_groupgameconfiguration_group_id_and_more"),
        ("gamification", "0005_badge_icons_and_revocations"),
        ("gamification", "0006_restore_external_ids_as_text"),
    ]

    dependencies = [
        ("gamification", "0003_studentprogress_pointreward"),
    ]

    operations = [
        migrations.CreateModel(
            name="Badge",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("group_id", models.CharField(max_length=100)),
                ("name", models.CharField(max_length=40)),
                ("description", models.CharField(blank=True, max_length=200)),
                (
                    "icon",
                    models.CharField(
                        choices=[
                            ("medal", "Medal"),
                            ("star", "Star"),
                            ("trophy", "Trophy"),
                        ],
                        default="medal",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="BadgeAward",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("student_id", models.CharField(max_length=100)),
                ("awarded_by", models.CharField(max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                (
                    "badge",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="awards",
                        to="gamification.badge",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(("revoked_at__isnull", True)),
                        fields=("badge", "student_id"),
                        name="unique_active_student_badge",
                    ),
                ],
            },
        ),
    ]
