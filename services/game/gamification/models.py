from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

CURRENCY_NAME_MAX_LENGTH = 30
RANK_NAME_MAX_LENGTH = 40
RANK_THRESHOLD_MAX = 1_000_000
MAX_RANKS = 20
CURRENCY_ICON_MAX_BYTES = 256 * 1024
CURRENCY_ICON_CONTENT_TYPES = frozenset({"image/png", "image/gif", "image/webp"})


class GroupGameConfiguration(models.Model):
    group_id = models.CharField(
        max_length=100,
        unique=True,
    )
    currency_name = models.CharField(
        max_length=CURRENCY_NAME_MAX_LENGTH,
        default="Punkty",
    )
    currency_icon = models.FileField(
        upload_to="currency-icons/%Y/%m/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self) -> str:
        return f"Configuration for group {self.group_id}"


class Rank(models.Model):
    configuration = models.ForeignKey(
        GroupGameConfiguration,
        on_delete=models.CASCADE,
        related_name="ranks",
    )
    name = models.CharField(
        max_length=RANK_NAME_MAX_LENGTH,
    )
    threshold = models.IntegerField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(RANK_THRESHOLD_MAX),
        ],
    )

    class Meta:
        ordering = ("threshold", "id")
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(
                fields=("configuration", "threshold"),
                name="unique_rank_threshold_per_configuration",
            ),
            models.UniqueConstraint(
                fields=("configuration", "name"),
                name="unique_rank_name_per_configuration",
            ),
            models.CheckConstraint(
                condition=(Q(threshold__gte=0) & Q(threshold__lte=RANK_THRESHOLD_MAX)),
                name="rank_threshold_between_0_and_1000000",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.threshold})"
