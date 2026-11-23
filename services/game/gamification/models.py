from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

CURRENCY_NAME_MAX_LENGTH = 30
RANK_NAME_MAX_LENGTH = 40
RANK_THRESHOLD_MAX = 1_000_000
MAX_RANKS = 20
CURRENCY_ICON_MAX_BYTES = 256 * 1024
CURRENCY_ICON_CONTENT_TYPES = frozenset({"image/png", "image/gif", "image/webp"})
REWARD_REASON_MAX_LENGTH = 200
# PostgreSQL's integer range also applies when developing locally with SQLite.
POINTS_MAX = 2**31 - 1


class GroupGameConfiguration(models.Model):
    group_id = models.CharField(max_length=100, unique=True)
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


class StudentProgress(models.Model):
    group_id = models.CharField(max_length=100)
    student_id = models.CharField(max_length=100)
    balance = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(
                fields=("group_id", "student_id"),
                name="unique_student_progress_per_group",
            ),
            models.CheckConstraint(
                condition=Q(balance__gte=0),
                name="student_balance_not_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"Progress for student {self.student_id}"


class PointReward(models.Model):
    progress = models.ForeignKey(
        StudentProgress,
        on_delete=models.CASCADE,
        related_name="rewards",
    )
    points = models.IntegerField(
        validators=[
            MinValueValidator(1),
        ],
    )
    reason = models.CharField(
        max_length=REWARD_REASON_MAX_LENGTH,
        blank=True,
    )
    awarded_by = models.CharField(
        max_length=100,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=Q(points__gte=1),
                name="reward_points_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.points} points for {self.progress.student_id}"


class Badge(models.Model):
    class Icon(models.TextChoices):
        MEDAL = "medal", "Medal"
        STAR = "star", "Star"
        TROPHY = "trophy", "Trophy"

    group_id = models.CharField(max_length=100)
    name = models.CharField(
        max_length=40,
    )
    description = models.CharField(
        max_length=200,
        blank=True,
    )
    icon = models.CharField(max_length=10, choices=Icon, default=Icon.MEDAL)
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self) -> str:
        return f"{self.name} badge for group {self.group_id}"


class BadgeAward(models.Model):
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="awards")
    student_id = models.CharField(max_length=100)
    awarded_by = models.CharField(
        max_length=100,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(
                fields=("badge", "student_id"),
                condition=Q(revoked_at__isnull=True),
                name="unique_active_student_badge",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.badge.name} badge for student: {self.student_id}"
