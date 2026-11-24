from typing import TypedDict
from uuid import UUID

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from .models import (
    CURRENCY_ICON_CONTENT_TYPES,
    CURRENCY_ICON_MAX_BYTES,
    POINTS_MAX,
    Badge,
    BadgeAward,
    GroupGameConfiguration,
    PointReward,
    Rank,
    StudentProgress,
)


class CurrencyIconError(ValueError):
    pass


class BalanceLimitError(Exception):
    pass


class BadgeNotFoundError(Exception):
    pass


class BadgeAwardNotFoundError(Exception):
    pass


class BadgeAlreadyAwardedError(Exception):
    pass


class RankInput(TypedDict):
    name: str
    threshold: int


def get_group_game_config(*, group_id: UUID) -> GroupGameConfiguration:
    configuration, _ = GroupGameConfiguration.objects.get_or_create(
        group_id=str(group_id)
    )
    return configuration


@transaction.atomic
def update_group_game_config(
    *,
    group_id: UUID,
    currency_name: str,
    ranks: list[RankInput],
) -> GroupGameConfiguration:
    configuration = get_group_game_config(group_id=group_id)
    configuration.currency_name = currency_name
    configuration.save()
    configuration.ranks.all().delete()
    Rank.objects.bulk_create(
        [
            Rank(
                configuration=configuration,
                name=rank["name"],
                threshold=rank["threshold"],
            )
            for rank in ranks
        ],
    )
    return configuration


@transaction.atomic
def upload_currency_icon(*, group_id: UUID, uploaded_file: UploadedFile) -> str:
    if uploaded_file.content_type not in CURRENCY_ICON_CONTENT_TYPES:
        raise CurrencyIconError("Icon must be PNG, GIF or WebP.")
    if uploaded_file.size > CURRENCY_ICON_MAX_BYTES:
        raise CurrencyIconError("Icon must not exceed 256 KB.")

    configuration = get_group_game_config(group_id=group_id)
    if configuration.currency_icon:
        configuration.currency_icon.delete(save=False)
    configuration.currency_icon.save(uploaded_file.name, uploaded_file, save=True)
    if not configuration.currency_icon:
        raise CurrencyIconError("Icon could not be stored.")
    return configuration.currency_icon.url


@transaction.atomic
def delete_currency_icon(*, group_id: UUID) -> None:
    configuration = GroupGameConfiguration.objects.filter(
        group_id=str(group_id)
    ).first()
    if configuration is not None and configuration.currency_icon:
        configuration.currency_icon.delete(save=True)


def calculate_rank(group_id: UUID, balance: int) -> Rank | None:
    return (
        Rank.objects.filter(
            configuration__group_id=str(group_id), threshold__lte=balance
        )
        .order_by("-threshold")
        .first()
    )


def get_student_progress(
    *,
    group_id: UUID,
    student_id: UUID,
) -> dict[str, UUID | int | Rank | None]:
    balance = (
        StudentProgress.objects.filter(
            group_id=str(group_id), student_id=str(student_id)
        )
        .values_list("balance", flat=True)
        .first()
    ) or 0

    return {
        "group_id": group_id,
        "student_id": student_id,
        "balance": balance,
        "rank": calculate_rank(group_id, balance),
    }


def get_reward_history(
    *,
    group_id: UUID,
    student_id: UUID,
) -> QuerySet[PointReward]:
    return PointReward.objects.select_related("progress").filter(
        progress__group_id=str(group_id),
        progress__student_id=str(student_id),
    )


@transaction.atomic
def award_points(
    *,
    group_id: UUID,
    student_id: UUID,
    points: int,
    reason: str,
    awarded_by: str,
) -> PointReward:
    progress, _ = StudentProgress.objects.select_for_update().get_or_create(
        group_id=str(group_id),
        student_id=str(student_id),
    )

    new_balance = progress.balance + points
    if new_balance > POINTS_MAX:
        raise BalanceLimitError

    reward = PointReward.objects.create(
        progress=progress,
        points=points,
        reason=reason,
        awarded_by=awarded_by,
    )

    progress.balance = new_balance
    progress.save(update_fields=("balance", "updated_at"))

    return reward


@transaction.atomic
def create_badge(
    *,
    group_id: UUID,
    name: str,
    description: str,
    icon: str,
) -> Badge:
    return Badge.objects.create(
        group_id=str(group_id),
        name=name,
        description=description,
        icon=icon,
    )


def list_group_badges(*, group_id: UUID) -> QuerySet[Badge]:
    return Badge.objects.filter(group_id=str(group_id)).order_by("created_at", "id")


def get_badge(*, group_id: UUID, badge_id: int) -> Badge:
    try:
        return Badge.objects.get(pk=badge_id, group_id=str(group_id))
    except Badge.DoesNotExist as exc:
        raise BadgeNotFoundError from exc


def update_badge(
    *,
    group_id: UUID,
    badge_id: int,
    name: str | None = None,
    description: str | None = None,
    icon: str | None = None,
) -> Badge:
    badge = get_badge(group_id=group_id, badge_id=badge_id)
    changes = {
        field: value
        for field, value in (
            ("name", name),
            ("description", description),
            ("icon", icon),
        )
        if value is not None
    }
    if changes:
        for field, value in changes.items():
            setattr(badge, field, value)
        badge.save(update_fields=changes.keys())
    return badge


def award_badge(
    *,
    group_id: UUID,
    badge_id: int,
    student_id: UUID,
    awarded_by: str,
) -> BadgeAward:
    badge = get_badge(group_id=group_id, badge_id=badge_id)
    award, created = BadgeAward.objects.get_or_create(
        badge=badge,
        student_id=str(student_id),
        revoked_at__isnull=True,
        defaults={
            "awarded_by": awarded_by,
        },
    )

    if not created:
        raise BadgeAlreadyAwardedError

    return award


def list_student_badges(
    *,
    group_id: UUID,
    student_id: UUID,
) -> QuerySet[BadgeAward]:
    return (
        BadgeAward.objects.select_related("badge")
        .filter(
            badge__group_id=str(group_id),
            student_id=str(student_id),
            revoked_at__isnull=True,
        )
        .order_by("-created_at", "-id")
    )


def revoke_badge(*, group_id: UUID, student_id: UUID, award_id: int) -> None:
    awards = BadgeAward.objects.filter(
        pk=award_id,
        badge__group_id=str(group_id),
        student_id=str(student_id),
    )
    updated = BadgeAward.objects.filter(
        pk__in=awards.values("pk"), revoked_at__isnull=True
    ).update(revoked_at=timezone.now())
    if not updated and not awards.exists():
        raise BadgeAwardNotFoundError
