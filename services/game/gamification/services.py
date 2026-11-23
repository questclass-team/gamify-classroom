from django.db import transaction
from django.db.models import QuerySet

from .models import POINTS_MAX, PointReward, Rank, StudentProgress


class BalanceLimitError(Exception):
    pass


def calculate_rank(group_id: str, balance: int) -> Rank | None:
    return (
        Rank.objects.filter(configuration__group_id=group_id, threshold__lte=balance)
        .order_by("-threshold")
        .first()
    )


@transaction.atomic
def award_points(
    *,
    group_id: str,
    student_id: str,
    points: int,
    reason: str,
    awarded_by: str,
) -> PointReward:
    progress, _ = StudentProgress.objects.select_for_update().get_or_create(
        group_id=group_id,
        student_id=student_id,
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


def get_student_progress(
    *,
    group_id: str,
    student_id: str,
) -> dict[str, str | int | Rank | None]:
    balance = (
        StudentProgress.objects.filter(group_id=group_id, student_id=student_id)
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
    group_id: str,
    student_id: str,
) -> QuerySet[PointReward]:
    return PointReward.objects.select_related("progress").filter(
        progress__group_id=group_id,
        progress__student_id=student_id,
    )
